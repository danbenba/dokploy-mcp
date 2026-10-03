The npm package is published as
[`dokploy-rest`](https://www.npmjs.com/package/dokploy-rest). Run it with no subcommand and it
serves the MCP tool surface over stdio; run `install` and it configures your assistants for you.

```bash
npx -y dokploy-rest --help
```

## Commands

### `dokploy-rest`

Starts the stdio MCP server. This is the form an assistant launches: it speaks the protocol on
stdin and stdout, and keeps every other message on stderr so the stream is never corrupted.

```bash
DOKPLOY_URL=https://panel.example.com \
DOKPLOY_API_KEY=your-key \
npx -y dokploy-rest
```

### `dokploy-rest install`

Detects the assistants installed on your machine, asks which to configure, obtains credentials, and
writes the server entry into each config.

```bash
npx -y dokploy-rest install
```

Detected: Claude Code, Claude Desktop, Cursor, Windsurf, VS Code, Zed, Gemini CLI, Codex CLI.

Configs are merged rather than overwritten, and a `.bak` copy is left next to each file. The
selection is a keyboard multiselect, with a plain prompt fallback in a non-interactive shell.

By default the installer opens your browser for the hosted sign-in, using PKCE against a loopback
callback, so you never paste a key. Pass `--url` and `--api-key` to skip the browser entirely,
which is what you want in a script.

```bash
npx -y dokploy-rest install \
  --url https://panel.example.com \
  --api-key your-key
```

## Options

```
dokploy-rest install [--server <url>] [--url <url> --api-key <keys>] [--name <name>]

--url <url>          Address of your Dokploy panel (or DOKPLOY_URL)
--api-key <keys>     One or more API keys, comma separated (or DOKPLOY_API_KEY)
--scopes <list>      Limit the tools exposed (or DOKPLOY_SCOPES)
--version            Print the version and exit
--help               Print this help and exit
```

| Flag | Environment | Notes |
|---|---|---|
| `--url` | `DOKPLOY_URL` | The panel the server talks to. Required unless the installer obtains it |
| `--api-key` | `DOKPLOY_API_KEY` | One key, or several comma separated, one per organization |
| `--scopes` | `DOKPLOY_SCOPES` | `read,deploy,create,delete,admin`. Everything, if unset |
| `--server` | — | `install` only: the hosted sign-in server. Defaults to `https://mcp.dokploy.rest` |
| `--name` | — | `install` only: the name the server is registered under. Defaults to `dokploy` |

A flag always beats the environment variable.

## Environment

| Variable | What it does |
|---|---|
| `DOKPLOY_URL` | Address of your panel |
| `DOKPLOY_API_KEY` | API keys, comma separated |
| `DOKPLOY_SCOPES` | Narrow the exposed tools |
| `DOKPLOY_REST_NO_UPDATE_CHECK` | Set to `1` to skip the npm update check |

## Several organizations

A Dokploy API key belongs to one organization. Pass one key per organization:

```bash
DOKPLOY_API_KEY="key-of-org-a,key-of-org-b" npx -y dokploy-rest
```

`dokploy_status` reports which organizations were recognised. `list_projects` covers all of them and
tags each project with its owner. `create_project` takes an `organization_id`. Every other tool
resolves the organization that owns the resource it is handed.

## Updates

Each run checks npm at most once every six hours. When a newer release exists, the CLI shows a
notice with the right command for how it was launched — `npx -y dokploy-rest@latest install` under
npx, `npm i -g dokploy-rest@latest` when installed globally — and offers to run the global update
interactively.

The stdio server only mentions an update on stderr. Disable the check with
`DOKPLOY_REST_NO_UPDATE_CHECK=1`.

## Exit behaviour

`install` exits with a status once its summary is printed. The loopback callback server closes every
connection as soon as the credentials arrive, and the browser tab closes itself, so the command does
not hang on a keep-alive connection. A sign-in link is only printed when `--print-url` is given or
the browser could not be opened, and a flow link is consumed as soon as consent is granted or
denied: opening it twice reports that it has already been used instead of replaying the sign-in.
