# Improvebot Implementation Plan

A TypeScript script that uses the GitHub Copilot SDK to create an autonomous agent that reviews agent skills and creates GitHub issues with improvement suggestions.

## Overview

The script will:
1. Enumerate all skills in `./skills/` directory
2. For each skill, create a Copilot agent with file system tools
3. The agent autonomously explores the skill directory and reads files
4. Agent generates a one-pager improvement report
5. Create a GitHub issue using `gh` CLI (unless `--dry-run`)

## Architecture

```
improvebot/review.ts
     │
     ├─→ Define custom tools (list_directory, read_file)
     │
     ├─→ Enumerate skills (fs.readdirSync)
     │
     ├─→ For each skill:
     │      ├─→ Create Copilot session with tools (gpt-5.2-codex)
     │      ├─→ Send review prompt with skill path
     │      ├─→ Agent uses tools to explore and read files
     │      └─→ Agent produces final report
     │
     └─→ Create GitHub issue via `gh issue create` (or print if --dry-run)
```

## Dependencies

Using bun's native capability to run TypeScript with inline imports:

```typescript
import { CopilotClient, SessionEvent, defineTool } from "@github/copilot-sdk";
import { z } from "zod";
import * as fs from "fs/promises";
```

Required packages (bun auto-installs on first run):
- `@github/copilot-sdk` - Copilot SDK for agent sessions
- `zod` - Schema validation for tool parameters

No `package.json` required - bun resolves imports directly.

## Command-Line Interface

```
bun run improvebot/review.ts [options]

Options:
  --dry-run    Print reports without creating GitHub issues
  --limit N    Limit review to first N skills (default: all)
```

Argument parsing will use `Bun.argv` or a simple manual parser (no external deps).

## Skills Discovery

Each skill lives in `./skills/<skill-name>/` with at minimum:
- `SKILL.md` - Main skill documentation
- Optional: `references/` directory with additional docs
- Optional: `scripts/` directory with implementation scripts

The script discovers skills dynamically by listing directories in `./skills/` (excluding `.gitkeep` and other non-directory entries).

## Copilot SDK Integration

### Custom Tools

The agent needs tools to explore the file system autonomously:

```typescript
const listDirectory = defineTool("list_directory", {
  description: "List files and subdirectories in a directory",
  parameters: z.object({
    path: z.string().describe("Path to the directory to list"),
  }),
  handler: async ({ path }) => {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries.map(e => ({
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
  handler: async ({ path }) => {
    return await fs.readFile(path, "utf-8");
  },
});
```

### Session Configuration

```typescript
const session = await client.createSession({
  model: "gpt-5.2-codex",  // Premium codex model for code review
  streaming: false,
  tools: [listDirectory, readFile],
});
```

### Review Prompt Template

```
You are an agent reviewing a skill. Your task is to explore the skill directory,
read all relevant files, and produce a one-pager improvement report.

## Skill Directory

The skill is located at: {skillPath}

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

Keep the report concise but actionable. Start exploring now.
```

### Event Handling

The SDK handles tool execution automatically. We listen for events to:
- Log all tool calls to stderr
- Capture the final response

```typescript
session.on((event: SessionEvent) => {
  if (event.type === "tool.execution_start") {
    console.error(`[Agent] Calling ${event.data.toolName}(${JSON.stringify(event.data.parameters)})`);
  }
  if (event.type === "tool.execution_end") {
    console.error(`[Tool]  → (returned)`);
  }
  if (event.type === "assistant.message") {
    // Final report is in event.data.content
  }
});
```

The SDK automatically:
1. Receives tool call requests from the model
2. Executes the registered tool handlers
3. Sends results back to the model
4. Repeats until the model produces a final response

## GitHub Issue Creation

Using `gh` CLI to create issues:

```bash
gh issue create \
  --title "Skill Review: {skillName}" \
  --body "{report}"
```

The `--dry-run` flag will:
- Print the report to stdout
- Print the `gh` command that would be run
- Skip actual issue creation

## Implementation Steps

1. **Parse CLI arguments** - Extract `--dry-run` and `--limit` flags
2. **Define tools** - Create `list_directory` and `read_file` tools
3. **Enumerate skills** - List directories in `./skills/`, filter out `.gitkeep`
4. **Initialize Copilot client** - Start the SDK client
5. **Process each skill**:
   - Create session with tools and gpt-5.2-codex model
   - Send review prompt with skill path
   - Agent autonomously explores via tool calls
   - Collect final report from agent response
6. **Create/print issues** - Use `gh` or print based on `--dry-run`
7. **Cleanup** - Destroy session and stop client

## Error Handling

- If Copilot SDK fails, log error and continue to next skill
- If `gh` fails, log error (issue not created) but continue
- Tool errors (e.g., file not found) are returned to the agent to handle

## File Structure

```
improvebot/
└── review.ts    # Single self-contained script
```

## Model Selection

The copilot-sdk skill documentation lists these premium models:
- `gpt-5.1-codex` - Premium codex model
- `gpt-5.2-codex` - Latest premium codex model (requested by user)

The script will use `gpt-5.2-codex` as specified.

## Sample Output (Dry Run)

```
=== Reviewing skill: context7 ===

Starting agent with gpt-5.2-codex...

[Agent] Calling list_directory("./skills/context7")
[Tool]  → [{name: "SKILL.md", type: "file"}]

[Agent] Calling read_file("./skills/context7/SKILL.md")
[Tool]  → (file contents returned to agent)

[Agent] Generating report...

--- REPORT ---

# Skill Review: context7

## Summary
This skill enables retrieval of current documentation for software libraries
via the Context7 API using curl commands.

## Strengths
- Clear two-step workflow (search → fetch)
- Good examples for popular frameworks
- No API key required for basic usage

## Areas for Improvement
- Add error handling examples for failed API calls
- Include rate limiting information
- Add caching suggestions for repeated queries

## Priority Actions
1. Document rate limits and best practices
2. Add troubleshooting section
3. Include more complex query examples

## Code Quality
N/A - No scripts in this skill

--- END REPORT ---

[dry-run] Would create issue:
  gh issue create --title "Skill Review: context7" --body "..."
```

## Design Decisions

- **Labels**: None
- **Assignees**: None
- **Path restrictions**: None - agent has unrestricted file access
- **Tool verbosity**: Log all tool calls to stderr

## Ready for Implementation

Once approved, the implementation will be a single `improvebot/review.ts` file runnable via:

```bash
bun run improvebot/review.ts --dry-run --limit 2
```
