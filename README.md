# Dokploy MCP

Open-source [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude or
ChatGPT operate the [Dokploy](https://dokploy.com) panel you host yourself.

Ask for a deployment, a database, a domain or the reason a build failed, in your own words. The
assistant works through Dokploy's own HTTP API, with the permissions you granted and nothing more.

> Work in progress. The interfaces described here already run, but they may still change.

## What the assistant can do

| Area | Tools |
|---|---|
| Projects | list, inspect, create and delete projects and environments |
| Applications | create, wire a GitHub, git or docker source, choose the build, set environment variables, deploy, restart |
| Compose | create stacks, replace the compose file, list services, deploy the one-click template catalog |
| Databases | provision postgres, mysql, mariadb, mongo, redis or libsql with generated credentials |
| Domains | attach hostnames with Let's Encrypt, validate DNS, generate a test domain, update or delete |
| Deployments | build history, build logs, the global queue, cancel or kill a build |
| Infrastructure | docker containers, `docker inspect`, remote servers |
| Everything else | `api_find` searches all 554 Dokploy endpoints, `dokploy_api` calls any of them |

Five playbooks ship with the server (`deploy`, `troubleshoot`, `database`, `template`, `domains`)
so the assistant follows Dokploy's real rules instead of guessing: build logs are not runtime logs,
a domain points at the container's listen port, databases talk over `dokploy-network`, and so on.

## Three ways to connect

### 1. Hosted connector

Add `https://mcp.dokploy.rest/mcp` as a custom connector in Claude or ChatGPT. You are sent to
[dokploy.rest](https://dokploy.rest), you enter the address of **your** panel, sign in, choose the
permissions, and you are back in the assistant. The connector never keeps your password: it
exchanges it for an API key created on your own instance.

### 2. Self-hosted

Run the same server on your own infrastructure:

```bash
git clone https://github.com/danbenba/dokploy-mcp
cd dokploy-mcp
cp apps/api/.env.example apps/api/.env

APP_KEY=$(openssl rand -base64 32) \
TOKEN_SECRET=$(openssl rand -base64 48) \
PUBLIC_URL=https://mcp.example.com \
WEB_URL=https://mcp-ui.example.com \
docker compose up -d
```

Point `DOKPLOY_LOCKED_URL` at a single panel if you want to skip the server-address step, and every
user of that deployment will authenticate against that instance only.

### 3. npm package

For a local assistant that already has an API key, skip OAuth entirely:

```bash
claude mcp add dokploy \
  -e DOKPLOY_URL=https://panel.example.com \
  -e DOKPLOY_API_KEY=your-key \
  -- npx -y dokploy-mcp
```

See [apps/cli/README.md](apps/cli/README.md) for Claude Desktop, scope narrowing and all flags.

## How the authorization flow works

```
Claude                 mcp.dokploy.rest              dokploy.rest              your panel
  │                          │                            │                        │
  │─ POST /oauth/register ──▶│                            │                        │
  │─ GET  /oauth/authorize ─▶│─ redirect /login?flow=… ──▶│                        │
  │                          │◀─ POST /flow/verify ───────│─ GET /api/health ─────▶│
  │                          │◀─ POST /flow/login ────────│─ sign-in, create key ─▶│
  │                          │◀─ POST /flow/consent ──────│                        │
  │◀── redirect ?code=… ─────│                            │                        │
  │─ POST /oauth/token ─────▶│                            │                        │
  │─ POST /mcp (Bearer) ────▶│──────── x-api-key ─────────────────────────────────▶│
```

The server is a full OAuth 2.1 authorization server: RFC 8414 and RFC 9728 discovery documents,
RFC 7591 dynamic client registration, mandatory PKCE with S256, and a `WWW-Authenticate` challenge
carrying the resource metadata URL so Claude discovers everything on its own.

There is no database. Every token is an encrypted JWE that carries the connection it stands for, so
the panel URL and its API key never sit in a store the server operator can read at rest.

## Security

- Panel addresses are verified before any credential is sent: DNS resolution, a public-address
  guard against SSRF, then two probes that confirm the host really is a Dokploy panel.
- Passwords are relayed once to the panel you named, exchanged for an API key, and never stored.
- Permissions are enforced twice: tools outside the granted scopes are not even listed, and every
  handler re-checks before touching the API.
- Destructive tools require an explicit confirmation argument on top of the `delete` scope.
- Revoking access is a single click in your own panel: delete the API key.

## Repository layout

```
apps/api      AdonisJS server: MCP endpoint, OAuth authorization server, login flow API
apps/web      Vite + React: landing page, login and consent screens
apps/cli      npm package published as dokploy-mcp, stdio transport
packages/core Shared core: Dokploy client, panel verification, endpoint catalog, tool surface
```

## Development

```bash
npm install
npm run build -w packages/core

cp apps/api/.env.example apps/api/.env   # then fill APP_KEY and TOKEN_SECRET
npm run dev -w apps/api                  # http://localhost:3333
npm run dev -w apps/web                  # http://localhost:5173
```

Tests:

```bash
npm run test -w apps/api    # 91 unit and functional tests
npm run test -w apps/cli    # cli option resolution
```

The Dokploy endpoint catalog embedded in `packages/core/src/mcp/catalog.json` is generated from
Dokploy's own `openapi.json`. Regenerate it after a Dokploy upgrade with the script in
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0. Not affiliated with Dokploy Technology, Inc. See [NOTICE](NOTICE).
