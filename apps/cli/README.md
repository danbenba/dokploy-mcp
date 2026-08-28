# dokploy-mcp

Model Context Protocol server for [Dokploy](https://dokploy.com). It gives Claude or ChatGPT
control of the Dokploy panel you host yourself, over stdio, using an API key you already own.

```bash
npx -y dokploy-mcp --help
```

## Setup

Generate an API key in Dokploy under **Settings → API Keys**, then register the server with your
assistant.

### Claude Code

```bash
claude mcp add dokploy \
  -e DOKPLOY_URL=https://panel.example.com \
  -e DOKPLOY_API_KEY=your-key \
  -- npx -y dokploy-mcp
```

### Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["-y", "dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-key"
      }
    }
  }
}
```

## Options

| Flag | Environment variable | Meaning |
|---|---|---|
| `--url` | `DOKPLOY_URL` | Address of the panel, with or without a trailing `/api` |
| `--api-key` | `DOKPLOY_API_KEY` | Key generated in Settings → API Keys |
| `--scopes` | `DOKPLOY_SCOPES` | Restrict what the assistant may do. Defaults to every scope |

Scopes are `read`, `deploy`, `create`, `delete` and `admin`. Tools outside the granted scopes are
not exposed at all, so a narrowed connection cannot be talked into a destructive action:

```bash
npx -y dokploy-mcp --scopes "read,deploy"
```

## What the assistant gets

Projects, environments, applications, compose stacks and six database engines; git and docker
sources, build settings, environment variables, deployments; domains with Let's Encrypt; build and
runtime logs; docker containers and remote servers. Anything not covered by the curated tools is
reachable through `api_find` and `dokploy_api`, which together expose all 554 Dokploy endpoints
with their real parameter schemas.

Five playbooks (`deploy`, `troubleshoot`, `database`, `template`, `domains`) teach the assistant
how Dokploy actually behaves, so it stops guessing about build logs versus runtime logs, container
ports versus published ports, and internal database networking.

## Connecting without sharing a key

If you would rather not paste an API key, use the hosted connector at
[dokploy.rest](https://dokploy.rest): you sign in to your own panel through an OAuth screen and it
creates a scoped key for you.

## License

Apache 2.0. Source at [github.com/danbenba/dokploy-mcp](https://github.com/danbenba/dokploy-mcp).
Not affiliated with Dokploy Technology, Inc.
