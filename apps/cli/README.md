# dokploy-rest

Dokploy MCP as an npm package. A [Model Context Protocol](https://modelcontextprotocol.io) server
for [Dokploy](https://dokploy.com) that gives Claude, ChatGPT or any MCP client control of the
Dokploy panel you host yourself, over stdio, using an API key you already own.

```bash
npx -y dokploy-rest --help
```

Prefer not to handle API keys at all? Add `https://mcp.dokploy.rest` as a custom connector
instead: [dokploy.rest](https://dokploy.rest) signs you in to your own panel, lets you pick the
organizations to expose and creates a scoped key for each of them.

## One-command setup

```bash
npx -y dokploy-rest install
```

The installer detects the assistants on your machine (Claude Code, Claude Desktop, Cursor,
Windsurf, VS Code, Zed, Gemini CLI, Codex CLI), opens your browser so you sign in to your own
Dokploy panel and pick the organizations to expose, then writes the server entry into every
assistant you selected. Existing config files are merged, never overwritten, and a `.bak` copy is
kept next to each one. Add `--url` and `--api-key` to skip the browser sign-in in scripts.

## Manual setup

Generate an API key in Dokploy under **Settings → API Keys**, then register the server with your
assistant.

### Claude Code

```bash
claude mcp add dokploy \
  -e DOKPLOY_URL=https://panel.example.com \
  -e DOKPLOY_API_KEY=your-key \
  -- npx -y dokploy-rest
```

### Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["-y", "dokploy-rest"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-key"
      }
    }
  }
}
```

### Cursor, Windsurf, Zed and others

Any client that launches stdio MCP servers works with the same `command`, `args` and `env`.

## Several organizations

A Dokploy API key belongs to one organization. To let the assistant reach several of them, create
one key per organization and pass them all, separated by commas:

```bash
DOKPLOY_API_KEY="key-of-org-a,key-of-org-b" npx -y dokploy-rest
```

`dokploy_status` lists the organizations that were recognised, `list_projects` covers all of them
and `create_project` accepts an `organization_id`. Every other tool finds the organization that
owns the resource it is given.

## Updates

Every run checks npm once every six hours and offers to update when a newer version exists
(`npx -y dokploy-rest@latest install` when launched through npx, `npm i -g dokploy-rest@latest`
when installed globally). Set `DOKPLOY_REST_NO_UPDATE_CHECK=1` to disable the check.

## Narrowing permissions

By default every tool is exposed. Restrict the surface with `--scopes` or `DOKPLOY_SCOPES`:

```bash
npx -y dokploy-rest --scopes "read,deploy"
```

| Scope | Unlocks |
|---|---|
| `read` | listing and inspecting everything, logs, the API catalog |
| `deploy` | deploy, restart, stop, environment variables, sources and builds |
| `create` | new projects, environments, applications, stacks, databases, domains |
| `delete` | removing services, projects, domains, mounts, ports |
| `admin` | `dokploy_api` POST calls to any endpoint |

## All options

```
dokploy-rest install [--server <url>] [--url <url> --api-key <keys>] [--name <name>]

--url <url>          Address of your Dokploy panel (or DOKPLOY_URL)
--api-key <keys>     One or more API keys, comma separated (or DOKPLOY_API_KEY)
--scopes <list>      Limit the tools exposed (or DOKPLOY_SCOPES)
--version            Print the version and exit
--help               Print this help and exit
```

## Source

Part of [danbenba/dokploy-mcp](https://github.com/danbenba/dokploy-mcp), Apache 2.0.
Not affiliated with Dokploy Technology, Inc.
