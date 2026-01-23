# CLI, Custom Agents, and MCP Servers

## GitHub Copilot CLI Configuration

The SDK uses Copilot CLI as its engine. Configuration is stored in `~/.copilot/` (or `$XDG_CONFIG_HOME/copilot/`):

- `config.json` - General configuration
- `mcp-config.json` - MCP server definitions

For full CLI documentation, see [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli).

---

# Custom Agents

Custom agents are specialized configurations with tailored expertise for specific tasks.

See [Creating Custom Agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) and [Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration).

## Agent Profile Structure

Custom agents use Markdown files with YAML frontmatter:

```yaml
---
name: my-agent
description: A specialized agent for specific tasks
tools: ["read", "edit", "search"]
target: github-copilot
mcp-servers:
  custom-mcp:
    type: 'local'
    command: 'mcp-server'
    args: ['--flag']
---

# Agent Instructions

Detailed behavioral instructions here (max 30,000 characters).
```

## YAML Frontmatter Properties

| Property | Type | Purpose |
|----------|------|---------|
| `name` | string | Display name (optional, defaults to filename) |
| `description` | string | **Required** - describes purpose and capabilities |
| `target` | string | Environment: `vscode` or `github-copilot` |
| `tools` | list/string | Available tools; defaults to all if unset |
| `infer` | boolean | Allow automatic selection based on context |
| `mcp-servers` | object | MCP server configurations (org/enterprise level) |

## Tools Configuration

Configure tool access:

- **Enable all:** Omit `tools` or use `tools: ["*"]`
- **Enable specific:** `tools: ["read", "edit", "search"]`
- **Disable all:** `tools: []`

**Tool Aliases:**
- `execute` - Run shell commands
- `read` - Access file contents
- `edit` - Modify files
- `search` - Find files/text (grep, glob)
- `agent` - Invoke other custom agents
- `web` - Web search/fetch

**MCP Tool References:** `mcp-server-name/tool-name` or `mcp-server-name/*`

## Agent Storage Locations

- **Repository:** `.github/agents/` directory
- **Organization/Enterprise:** Configured via GitHub settings
- **System:** CLI includes default agents

**Priority (naming conflicts):** System > Repository > Organization

---

# MCP Server Integration

Model Context Protocol (MCP) servers extend Copilot's capabilities with external tools and resources.

See [Enhancing Agent Mode with MCP](https://docs.github.com/en/copilot/tutorials/enhance-agent-mode-with-mcp) and [Setting up the GitHub MCP Server](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/set-up-the-github-mcp-server).

## Default MCP Server

Copilot CLI comes with the GitHub MCP server pre-configured, enabling:
- Repository access and management
- Pull request operations
- Issue tracking
- GitHub workflow management

## MCP Configuration Format

MCP servers are configured in `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "server-name": {
      "type": "local",
      "command": "mcp-server-command",
      "args": ["--arg1", "--arg2"],
      "env": {
        "API_KEY": "$COPILOT_MCP_API_KEY"
      }
    }
  }
}
```

## Environment Variables in MCP Config

Supported patterns:
- `$COPILOT_MCP_VAR`
- `${COPILOT_MCP_VAR}`
- `${{ secrets.COPILOT_MCP_VAR }}`
- `${{ var.COPILOT_MCP_VAR }}`
