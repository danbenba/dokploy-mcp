The failures that come up most, and where the answer actually lives.

## The site answers 502

Almost always the domain points at the wrong port.

A domain routes to the port the container **listens on**, not to a published host port and not to
80 because that is what the browser used. Check what the app binds:

```
Show me the application config and its domains
```

| Stack | Usual port |
|---|---|
| Next.js, Node | 3000 |
| Vite preview | 4173 |
| nginx, static builds | 80 |
| Django, uvicorn | 8000 |
| Laravel | 8000 or 80 |

Fix it with `update_domain` rather than recreating the domain.

The second cause is an app bound to `localhost`. Inside a container that means it answers only
itself, and Traefik gets nothing. Bind `0.0.0.0`.

## The build failed

Read the **build** log, not the runtime log:

```
List the deployments for api, then show me the log of the failed one
```

That is `list_deployments` then `deployment_logs`. The runtime log of a service that never built
successfully is empty or shows the previous version, which is how people end up debugging the wrong
thing.

## It built fine and then crashed

Now read the **runtime** log, which is `service_logs`. A successful build followed by a container
that exits means the process itself failed: a missing environment variable, a database it cannot
reach, a port already in use.

If neither log explains it, `container_config` returns the `docker inspect` output, which shows the
actual command, the env, the mounts and the exit code.

## My environment variables disappeared

`set_service_env` replaces the whole block. It does not merge.

Ask for the complete set, not a diff:

```
Set the env for api to exactly these variables: ...
```

To add one safely, have the assistant read the current block first and send it back with the
addition.

## The deployment says it succeeded but nothing changed

Deployments are asynchronous. `service_action` returns when the build is **queued**, not when it is
finished. The result comes from `list_deployments` until the status leaves `running`.

If the status never leaves `running`, look at `deployment_queue`: another build may be holding the
queue.

## The certificate never issues

Let's Encrypt validates over HTTP, so the hostname has to resolve to the server before the
certificate can exist. Check DNS first:

```
Validate the domain app.example.com before attaching it
```

That is `validate_domain`. Behind a proxying CDN, an orange-cloud record can break HTTP validation;
a DNS-only record to the server is the simplest fix.

No real domain ready? `generate_domain` gives a free hostname for testing.

## A service cannot reach the database

Services talk over the shared `dokploy-network`, using the database's `appName` as the hostname, on
the engine's default port:

```
postgresql://user:pass@myproject-db-a1b2c3:5432/dbname
```

Not `localhost`, not the server's public IP, and no external port needed. `set_database_external_port`
is only for a client **outside** the server, and setting one by reflex is how a database ends up
reachable from the internet.

A compose stack that serves web traffic must also join `dokploy-network`, which is an external
network. A stack that declares only its own private network is unreachable from Traefik.

## The assistant refuses a tool

```
Refused: this connection was granted read and deploy only.
```

That is the scope system working. Reconnect with a larger grant, or for a stdio install drop the
`--scopes` narrowing. See [permissions](/permissions).

A refusal mentioning `confirm` is the destructive-tool guard: `delete_project` and `delete_service`
require `confirm: true` on top of the `delete` scope.

## The tool is not there at all

Tools outside your grant are not registered, so the assistant genuinely cannot see them. Check what
the connection actually has:

```
What does dokploy_status report?
```

If the tool exists in Dokploy but not here, `api_find` searches all 554 endpoints with their real
schemas and `dokploy_api` calls any of them — `read` covers GET, `admin` is needed for POST.

## Sign-in is refused before the password

The address you typed did not pass verification: it did not resolve, it resolved to a private or
loopback address, or it does not answer like a Dokploy panel. Plain `http://` is accepted unless
the operator set `ALLOW_INSECURE_DOKPLOY=false`.

A panel on a private address is the normal case for this message. Use the
[npm package](/npm-package), which runs on a machine that can already reach it, rather than asking
a public server to reach into your network.

## The connection stopped working

Check, in this order:

1. The API key still exists in your panel under **Settings → API Keys**. Deleting it is the
   revocation path, and it may have been deleted deliberately.
2. The refresh token is under 30 days old. Past that, reconnect.
3. The panel is up: `dokploy_status` fails loudly when it is not.

## Still stuck

Open an issue at
[github.com/danbenba/dokploy-mcp/issues](https://github.com/danbenba/dokploy-mcp/issues) with the
tool you called and what came back. Redact keys and environment variables before pasting anything.

Suspected vulnerabilities go through
[SECURITY.md](https://github.com/danbenba/dokploy-mcp/blob/main/SECURITY.md), not a public issue.
