# @eocrm/design-system-mcp

MCP server (stdio) that gives AI coding agents the docs of the `@eocrm/design-system` version **your project has installed**, so the agent never works from docs for a different release.

## What it does

Tools:

- `get_primer` — the `AI-PRIMER.md` (read this first).
- `list_components` — the component index.
- `get_component_doc` — one component's contract (`docs/components/<Name>.md`).
- `get_doc` — any other doc (`docs/setup.md`, `docs/theming.md`, …), or topic `readme` for the design-system README (install, bundler notes).

**Version matching.** The server resolves the `@eocrm/design-system` version from the project's lockfile (npm, pnpm, yarn, bun), falling back to the range in `package.json`, and serves that release's docs. If the project doesn't depend on it, it uses the latest published release; the response says which version and source was used. Docs are fetched once and cached.

**Offline.** If a version can't be fetched and isn't cached, the server serves the docs bundled with the server package and says in the response which version they are for.

**Cache** (`<v>` is the design-system version):

- `$XDG_CACHE_HOME/eocrm-design-system-mcp/<v>/` when `XDG_CACHE_HOME` is set
- Windows: `%LOCALAPPDATA%\eocrm-design-system-mcp\<v>\`
- otherwise `~/.cache/eocrm-design-system-mcp/<v>/`

Delete the folder to force a refetch.

## Install (user scope)

Every example registers the server as `eocrm-design-system`. Requires Node 20+.

### Claude Code

```bash
claude mcp add --scope user eocrm-design-system -- npx -y @eocrm/design-system-mcp
```

### Codex

```bash
codex mcp add eocrm-design-system -- npx -y @eocrm/design-system-mcp
```

Or add to `~/.codex/config.toml`:

```toml
[mcp_servers.eocrm-design-system]
command = "npx"
args = ["-y", "@eocrm/design-system-mcp"]
```

### Cursor

Open this link (Cursor prompts before installing):

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=eocrm-design-system&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBlb2NybS9kZXNpZ24tc3lzdGVtLW1jcCJdfQ==
```

Or add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "eocrm-design-system": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@eocrm/design-system-mcp"]
    }
  }
}
```

### VS Code

Open this link:

```text
vscode:mcp/install?%7B%22name%22%3A%22eocrm-design-system%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40eocrm%2Fdesign-system-mcp%22%5D%7D
```

Or run `code --add-mcp '{"name":"eocrm-design-system","type":"stdio","command":"npx","args":["-y","@eocrm/design-system-mcp"]}'`, or run **MCP: Open User Configuration** and add (note: VS Code uses `servers`, not `mcpServers`):

```json
{
  "servers": {
    "eocrm-design-system": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@eocrm/design-system-mcp"]
    }
  }
}
```

### Other clients

Most clients accept this block (the top-level key is usually `mcpServers`):

```json
{
  "mcpServers": {
    "eocrm-design-system": {
      "command": "npx",
      "args": ["-y", "@eocrm/design-system-mcp"]
    }
  }
}
```

## Agent skill

The skill tells the agent to consult the server before writing UI. Install it for every supported client found in your home directory (Claude Code, Codex, Cursor, Copilot):

```bash
npx -y @eocrm/design-system-mcp install-skill
```

Add `--dry-run` to print the target paths without writing.

## Troubleshooting

- **Tools missing after install:** MCP tools bind at session start. Restart the client (or start a new session).
- **Wrong version served:** the server reads the lockfile of the project root the client reports (or the directory the client was started in). Start the client from the project root, and run your package manager's install first.
- **Stale or corrupt docs:** delete the cache folder above.
- **`npx` not found (Windows clients that don't resolve `.cmd`):** use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@eocrm/design-system-mcp"]`.

## Client docs the formats were checked against

- Claude Code: https://code.claude.com/docs/en/mcp
- Codex: https://learn.chatgpt.com/docs/extend/mcp
- Cursor: https://cursor.com/docs/context/mcp and https://cursor.com/docs/context/mcp/install-links
- VS Code: https://code.visualstudio.com/docs/agents/reference/mcp-configuration and https://code.visualstudio.com/docs/copilot/guides/mcp-developer-guide
