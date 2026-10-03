Permissions are chosen when you connect, one by one, and they are enforced twice: a tool outside
the grant is never listed to the assistant, and every handler checks again before touching your
panel.

## The five scopes

| Scope | Label | What it unlocks |
|---|---|---|
| `read` | Read your infrastructure | List projects, environments, services, domains and deployments, and read build and runtime logs |
| `deploy` | Deploy and operate services | Trigger deployments, start, stop and restart services, change environment variables, sources and build settings |
| `create` | Create resources | Create projects, environments, applications, compose stacks, databases and domains |
| `delete` | Delete resources | Permanently delete projects, services and domains, including database volumes |
| `admin` | Full API access | Call any Dokploy API endpoint, including server settings, backups, registries and user management |

`read`, `deploy` and `create` are the default grant. `delete` and `admin` are marked risky in the
consent screen and are off unless you turn them on.

## How they combine

- `admin` implies everything. A connection granted `admin` passes every check.
- Any granted scope implies `read`, since inspecting a resource is a prerequisite for acting on it.
- Otherwise a tool needs its exact scope. `deploy` does not grant `create`, and `create` does not
  grant `delete`.

So a grant of `read, deploy` can redeploy an existing application and change its environment
variables, but cannot create a new one, and cannot delete anything.

## Enforced twice

**At registration.** When your assistant connects, only the tools covered by the grant are
registered on the MCP server. The assistant's tool list genuinely does not contain the others, so
it cannot be talked into calling one.

**At call time.** Every handler calls `requireScope` before it reaches for the API. A client that
replays an old tool name, or a token whose scopes were narrowed since, is refused.

```
Delete the staging project
  → delete_project
  → Refused: this connection was granted read and deploy only.
```

## Destructive tools need confirmation too

For the two tools that destroy data irreversibly, the `delete` scope is not enough on its own.
`delete_project` and `delete_service` both take a `confirm` argument and refuse the call unless it
is `true`, so a model cannot wipe a project as a side effect of a vaguely worded request: it has to
state plainly what it is about to destroy.

```
Refusing to delete without confirm set to true: this removes every service
and database in the project.
```

## Narrowing a stdio install

With the [npm package](/npm-package) the key you supply already carries your own panel
permissions, so every tool is exposed by default. Narrow it yourself:

```bash
npx -y dokploy-rest --scopes "read,deploy"
```

```bash
DOKPLOY_SCOPES="read" npx -y dokploy-rest
```

An empty or unrecognised list falls back to the default `read, deploy, create` rather than to
everything.

## Revoking

Delete the API key in your panel under **Settings → API Keys**. That is the whole revocation story:
the key is the only thing that grants access to your instance, it lives on your instance, and
removing it breaks the connection immediately.

Narrowing instead of revoking means reconnecting with a smaller grant. Tokens carry the scopes they
were issued with, so an existing token keeps its old grant until it expires.
