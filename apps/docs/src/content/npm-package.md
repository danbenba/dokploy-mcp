[`dokploy-rest`](https://www.npmjs.com/package/dokploy-rest) is the same tool surface, served over
stdio by a process that runs next to your assistant, using an API key you already own. No OAuth, no
third party in the path.

## One command

```bash
npx -y dokploy-rest install
```

The installer detects the assistants on your machine — Claude Code, Claude Desktop, Cursor,
Windsurf, VS Code, Zed, Gemini CLI and Codex CLI — lets you pick which to configure, opens your
browser so you sign in to your own panel and choose the organizations to expose, then writes the
server entry into each config you selected.

Existing config files are merged, never overwritten, and a `.bak` copy is kept next to each one.

Add `--url` and `--api-key` to skip the browser step in a script:

```bash
npx -y dokploy-rest install \
  --url https://panel.example.com \
  --api-key your-key
```

## Manual setup

Create an API key in Dokploy under **Settings → API Keys**, then register the server yourself.

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

Any client that launches stdio MCP servers takes the same `command`, `args` and `env`.

## Several organizations

A key belongs to one organization. Create one key per organization and pass them all, comma
separated:

```bash
DOKPLOY_API_KEY="key-of-org-a,key-of-org-b" npx -y dokploy-rest
```

`dokploy_status` lists the organizations that were recognised, and every tool resolves the
organization that owns the resource it is handed.

## Narrowing what is exposed

By default every tool is available, because the key you supplied already carries your own panel
permissions. Narrow the surface with `--scopes` or `DOKPLOY_SCOPES`:

```bash
npx -y dokploy-rest --scopes "read,deploy"
```

Tools outside the list are not registered at all, so the assistant cannot call them. See
[permissions](/permissions).

## Updates

Every run checks npm once every six hours and offers to update when a newer release exists:
`npx -y dokploy-rest@latest install` when launched through npx, `npm i -g dokploy-rest@latest` when
installed globally. The stdio server only mentions it on stderr, so it never corrupts the protocol
stream.

Set `DOKPLOY_REST_NO_UPDATE_CHECK=1` to turn the check off.

## All options

```
dokploy-rest install [--server <url>] [--url <url> --api-key <keys>] [--name <name>]

--url <url>          Address of your Dokploy panel (or DOKPLOY_URL)
--api-key <keys>     One or more API keys, comma separated (or DOKPLOY_API_KEY)
--scopes <list>      Limit the tools exposed (or DOKPLOY_SCOPES)
--version            Print the version and exit
--help               Print this help and exit
```

The [CLI reference](/cli) covers each flag and its environment variable in detail.
