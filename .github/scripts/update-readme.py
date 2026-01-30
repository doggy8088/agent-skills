#!/usr/bin/env python3
"""Update README.md with a table of skills from the skills directory."""

import os
import re
from pathlib import Path

import yaml


def parse_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown content."""
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if match:
        return yaml.safe_load(match.group(1))
    return {}


def get_skills(skills_dir: Path) -> list[dict]:
    """Get all skills from the skills directory."""
    skills = []

    for skill_path in skills_dir.iterdir():
        if not skill_path.is_dir():
            continue

        skill_md = skill_path / "SKILL.md"
        if not skill_md.exists():
            continue

        content = skill_md.read_text()
        frontmatter = parse_frontmatter(content)

        if "description" in frontmatter:
            skills.append({
                "name": skill_path.name,
                "description": frontmatter["description"],
            })

    return sorted(skills, key=lambda s: s["name"].lower())


def generate_installation_section() -> str:
    """Generate the installation section."""
    return """## Installation

### As a Plugin Marketplace (Claude Code / Cowork)

Add this repository as a plugin marketplace:
```bash
/plugin marketplace add intellectronica/agent-skills
```

Install individual plugins:
```bash
/plugin install anki-connect@intellectronica-skills
```

### As Agent Skills (npx)

```bash
npx skills add intellectronica/agent-skills --skill anki-connect
```

---

> **Note**: The `plugins/` directory is auto-generated from `skills/`.
> To contribute, edit files in `skills/` — do not edit `plugins/` directly.

---

"""


def generate_table(skills: list[dict], repo_url: str) -> str:
    """Generate a markdown table of skills."""
    lines = [
        generate_installation_section(),
        "| Skill | Description |",
        "|-------|-------------|",
    ]

    for skill in skills:
        skill_link = f"[{skill['name']}]({repo_url}/tree/main/skills/{skill['name']})"
        description = skill["description"].replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {skill_link} | {description} |")
        npx_cmd = f'```npx skills add intellectronica/agent-skills --skill {skill["name"]}```'
        lines.append(f"| | {npx_cmd} |")
        plugin_cmd = f'```/plugin install {skill["name"]}@intellectronica-skills```'
        lines.append(f"| | {plugin_cmd} |")

    return "\n".join(lines)


def update_readme(readme_path: Path, table: str) -> None:
    """Update README.md with the skills table between --- separators."""
    content = readme_path.read_text()

    # Find first and last --- separators
    separator = "---"
    first_sep = content.find(separator)
    last_sep = content.rfind(separator)

    if first_sep == -1 or last_sep == -1 or first_sep == last_sep:
        raise ValueError("README.md must contain at least two --- separators")

    # Get content before first separator (including the separator and newline)
    before = content[:first_sep + len(separator)] + "\n\n"

    # Get content after last separator (including the separator)
    after = "\n\n" + content[last_sep:]

    # Combine with new table
    new_content = before + table + after

    readme_path.write_text(new_content)


def get_repo_url() -> str:
    """Get the GitHub repository URL from git remote or environment."""
    # Try GitHub Actions environment variable first
    github_repository = os.environ.get("GITHUB_REPOSITORY")
    if github_repository:
        return f"https://github.com/{github_repository}"

    # Fall back to parsing git remote
    try:
        import subprocess
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
        )
        url = result.stdout.strip()
        # Convert SSH URL to HTTPS if needed
        if url.startswith("git@github.com:"):
            url = url.replace("git@github.com:", "https://github.com/")
        if url.endswith(".git"):
            url = url[:-4]
        return url
    except Exception:
        return "https://github.com/OWNER/REPO"


def main():
    repo_root = Path(__file__).parent.parent.parent
    skills_dir = repo_root / "skills"
    readme_path = repo_root / "README.md"

    repo_url = get_repo_url()
    skills = get_skills(skills_dir)
    table = generate_table(skills, repo_url)
    update_readme(readme_path, table)

    print(f"Updated README.md with {len(skills)} skills")


if __name__ == "__main__":
    main()
