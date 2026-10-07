Run the same server on your own infrastructure and every hop stays yours. The source is
[danbenba/dokploy-mcp](https://github.com/danbenba/dokploy-mcp), Apache 2.0.

## Docker Compose

```bash
git clone https://github.com/danbenba/dokploy-mcp
cd dokploy-mcp
cp .env.example .env
```

Fill the two secrets, then start both services:

```bash
APP_KEY=$(openssl rand -base64 32) \
TOKEN_SECRET=$(openssl rand -base64 48) \
PUBLIC_URL=https://mcp.example.com \
WEB_URL=https://mcp-ui.example.com \
docker compose up -d
```

The compose file builds two images and joins the external `dokploy-network`, so you can put it
behind the same Traefik that fronts the rest of your panel:

| Service | What it is | Listens on |
|---|---|---|
| `mcp` | AdonisJS API: the MCP endpoint, the OAuth server, the login flow | `3333` |
| `web` | nginx serving the built Vite site: landing, login and consent screens | `80` |

Point a domain at `mcp` on port 3333 and another at `web` on port 80. Both need TLS, because
clients refuse a plain-HTTP authorization server.

## Environment

| Variable | Default | What it does |
|---|---|---|
| `APP_KEY` | *required* | AdonisJS application key. `openssl rand -base64 32` |
| `TOKEN_SECRET` | *required* | Encrypts every issued token. `openssl rand -base64 48`. Rotating it invalidates all of them |
| `PUBLIC_URL` | `http://localhost:$PORT` | Public address of the API, the URL users paste into their assistant |
| `WEB_URL` | `PUBLIC_URL` | Public address of the login and consent UI |
| `BRAND_NAME` | `Dokploy MCP` | Name shown in the UI |
| `API_KEY_LABEL` | `Dokploy MCP` | Label given to the keys created on a user's panel |
| `ACCESS_TOKEN_TTL` | `43200` | Access token lifetime, in seconds |
| `REFRESH_TOKEN_TTL` | `31536000` | Refresh token lifetime, in seconds |
| `AUTH_CODE_TTL` | `120` | Authorization code lifetime, in seconds |
| `FLOW_SESSION_TTL` | `900` | Sign-in flow lifetime, in seconds |
| `DOKPLOY_LOCKED_URL` | unset | Restrict the deployment to a single panel |
| `ALLOW_PRIVATE_NETWORKS` | `false` | Allow panels on private and loopback addresses |
| `ALLOW_INSECURE_DOKPLOY` | `true` | Accept panels reached over plain HTTP |
| `LOG_LEVEL` | `info` | pino log level |

The compose file ships tighter production values than the development defaults above:
`ACCESS_TOKEN_TTL=3600` and `REFRESH_TOKEN_TTL=2592000`.

### Locking to one panel

Set `DOKPLOY_LOCKED_URL` and the server-address step disappears. Every user of that deployment
authenticates against that instance and no other. This is the right setting for a team deployment
in front of a single panel.

```bash
DOKPLOY_LOCKED_URL=https://panel.example.com
```

### The two guards

`ALLOW_PRIVATE_NETWORKS` exists for local development. It disables the check that stops the server
from being pointed at a private address, which is exactly the shape of a server-side request
forgery. Keep it `false` anywhere a stranger can reach the sign-in form.

`ALLOW_INSECURE_DOKPLOY` is the opposite: it defaults to `true`, so a panel without a certificate
works out of the box, and the sign-in screens warn that credentials cross the network in clear. Set
it to `false` to accept https panels only.

If your panel genuinely sits on a private address, the [npm package](/npm-package) is the better
answer: it runs on a machine that can already reach it.

## Without the hosted UI

The OAuth flow needs the consent screens, so the `web` service is part of the hosted-connector
story. If all you want is the tool surface for your own assistant, you do not need either service:
use the [npm package](/npm-package) over stdio with an API key.

## Deploying it with Dokploy itself

The repository is laid out so each app is one Dockerfile:

| App | Dockerfile | Serves |
|---|---|---|
| API | `apps/api/Dockerfile` | the MCP endpoint and OAuth server |
| Web | `apps/web/Dockerfile` | the landing, login and consent site |
| Docs | `apps/docs/Dockerfile` | this documentation site |
| Legal | `apps/legal/Dockerfile` | the privacy policy, license and notice |

Create one Dokploy application per app, set the build type to Dockerfile, point it at the path
above with `.` as the context, attach a domain on the right port — 3333 for the API, 80 for the
static sites — and deploy.

## Development

```bash
npm install
npm run build -w packages/core

cp apps/api/.env.example apps/api/.env   # then fill APP_KEY and TOKEN_SECRET
npm run dev -w apps/api                  # http://localhost:3333
npm run dev -w apps/web                  # http://localhost:5173
npm run dev -w apps/docs                 # http://localhost:5174
```

Tests:

```bash
npm run test -w apps/api    # unit and functional tests
npm run test -w apps/cli    # cli option resolution
```

The endpoint catalog in `packages/core/src/mcp/catalog.json` is generated from Dokploy's own
`openapi.json`. Regenerate it after a Dokploy upgrade with the script described in
[CONTRIBUTING.md](https://github.com/danbenba/dokploy-mcp/blob/main/CONTRIBUTING.md).
