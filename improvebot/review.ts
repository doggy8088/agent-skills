import { CopilotClient, SessionEvent, defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import * as fs from "fs/promises";
import { execSync } from "child_process";
import * as path from "path";

// CLI argument parsing
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : Infinity;

// Custom tools for the agent
const listDirectory = defineTool("list_directory", {
  description: "List files and subdirectories in a directory",
  parameters: z.object({
    path: z.string().describe("Path to the directory to list"),
  }),
  handler: async ({ path: dirPath }) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
    }));
  },
});

const readFile = defineTool("read_file", {
  description: "Read the contents of a file",
  parameters: z.object({
    path: z.string().describe("Path to the file to read"),
  }),
  handler: async ({ path: filePath }) => {
    return await fs.readFile(filePath, "utf-8");
  },
});

// Review prompt template
const reviewPrompt = (skillPath: string) => `You are an agent reviewing a skill. Your task is to explore the skill directory,
read all relevant files, and produce a one-pager improvement report.

## Skill Directory

The skill is located at: ${skillPath}

## Instructions

1. Use the list_directory tool to explore the skill directory
2. Use the read_file tool to read SKILL.md and any other relevant files
3. Explore subdirectories like references/ and scripts/ if they exist
4. Read all files that seem relevant to understanding the skill

Once you have explored the skill thoroughly, produce a structured report with:

1. **Summary** - What the skill does (2-3 sentences)
2. **Strengths** - What works well (bullet points)
3. **Areas for Improvement** - Specific suggestions (bullet points)
4. **Priority Actions** - Top 3 recommended changes
5. **Code Quality** - Notes on any scripts (if applicable)

Keep the report concise but actionable. Start exploring now.`;

async function discoverSkills(skillsDir: string): Promise<string[]> {
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);
}

async function reviewSkill(
  client: CopilotClient,
  skillName: string,
  skillPath: string
): Promise<string> {
  console.error(`\n=== Reviewing skill: ${skillName} ===\n`);
  console.error(`Starting agent with gpt-5.2-codex...\n`);

  const session = await client.createSession({
    model: "gpt-5.2-codex",
    streaming: false,
    tools: [listDirectory, readFile],
  });

  const done = new Promise<string>((resolve) => {
    let content = "";

    session.on((event: SessionEvent) => {
      if (event.type === "tool.execution_start") {
        console.error(
          `[Agent] Calling ${event.data.toolName}(${JSON.stringify(event.data.parameters)})`
        );
      }
      if (event.type === "tool.execution_end") {
        console.error(`[Tool]  -> (returned)`);
      }
      if (event.type === "assistant.message") {
        content = event.data.content ?? "";
      }
      if (event.type === "session.idle") {
        resolve(content);
      }
    });
  });

  await session.send({ prompt: reviewPrompt(skillPath) });
  const report = await done;

  await session.destroy();
  return report;
}

function createGitHubIssue(skillName: string, report: string): void {
  const title = `Skill Review: ${skillName}`;
  const body = report;

  try {
    execSync(
      `gh issue create --title "${title.replace(/"/g, '\\"')}" --body "$(cat <<'EOF'\n${body}\nEOF\n)"`,
      { stdio: "inherit" }
    );
    console.error(`[Issue] Created issue for ${skillName}`);
  } catch (error) {
    console.error(`[Error] Failed to create issue for ${skillName}:`, error);
  }
}

async function main() {
  const skillsDir = path.resolve("./skills");

  console.error(`Discovering skills in ${skillsDir}...`);
  let skills = await discoverSkills(skillsDir);

  if (limit < Infinity) {
    skills = skills.slice(0, limit);
    console.error(`Limited to ${limit} skill(s)`);
  }

  console.error(`Found ${skills.length} skill(s) to review\n`);

  const client = new CopilotClient();
  await client.start();

  for (const skillName of skills) {
    const skillPath = path.join(skillsDir, skillName);

    try {
      const report = await reviewSkill(client, skillName, skillPath);

      console.log(`\n--- REPORT: ${skillName} ---\n`);
      console.log(report);
      console.log(`\n--- END REPORT ---\n`);

      if (dryRun) {
        console.error(
          `[dry-run] Would create issue:\n  gh issue create --title "Skill Review: ${skillName}" --body "..."`
        );
      } else {
        createGitHubIssue(skillName, report);
      }
    } catch (error) {
      console.error(`[Error] Failed to review skill ${skillName}:`, error);
    }
  }

  await client.stop();
  console.error(`\nDone.`);
}

main();
