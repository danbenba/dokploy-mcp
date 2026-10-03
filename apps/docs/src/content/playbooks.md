A general-purpose assistant will happily invent a Dokploy workflow, confidently and wrongly. Five
playbooks ship inside the server so it follows the real behaviour instead.

The assistant reads one with `playbook(name)`. Each names the exact tool for every step, in order,
and says what to do when a step fails.

```
playbook("deploy")
```

| Playbook | Covers |
|---|---|
| `deploy` | Putting a site or app online from nothing: project, service, source, build, variables, domain, deploy, verify |
| `troubleshoot` | A deployment that failed, or a service that is up but answering wrongly |
| `database` | Provisioning an engine and wiring other services to it |
| `template` | The one-click catalog, from browsing to a running stack |
| `domains` | Attaching hostnames, DNS, certificates and ports |

## What they encode

The playbooks exist because of the mistakes they prevent.

**Build logs are not runtime logs.** `deployment_logs` explains a failure *during* a deployment.
`service_logs` explains a crash *after* a successful build. Reading the wrong one is the single most
common way to chase a problem that is not there.

**A domain routes to the container's listen port.** Not to a published host port, and not to 80
because that is what the browser used. Next.js and Node usually 3000, Vite preview 4173, nginx and
static builds 80, Django and uvicorn 8000. The wrong number here is the usual cause of a 502.

**An application must bind `0.0.0.0`.** Bound to `localhost`, a container answers only itself, and
Traefik gets nothing. The deployment succeeds and the site is still broken.

**Databases talk over `dokploy-network`.** Another service reaches one by its `appName` as the
hostname, on the engine's default port. An external port is only for clients outside the server, and
exposing one by reflex is how a database ends up on the public internet.

**Compose services that receive web traffic must join `dokploy-network`.** It is an external
network; a stack that declares its own private network is unreachable from Traefik.

**Deployments are asynchronous.** `service_action` returns when the build is *queued*. The result
comes from polling `list_deployments` until the status leaves `running`, then reading the logs if it
ended in `error`. Reporting success from the call that started the build is simply wrong.

**Set the whole environment block.** `set_service_env` replaces every variable, it does not merge a
diff. Sending one new variable silently deletes the rest.

## The deploy playbook, in outline

0. `dokploy_status` to confirm the connection, `list_projects` to see whether a suitable project
   already exists — "deploy X" usually means "in the obvious place".
1. Reuse the project's production environment, or `create_project`, which creates one.
2. `create_application` for a single app, `create_compose` for a stack with a compose file.
3. `configure_app_source` with exactly one provider: a linked GitHub account, any git URL, or a
   prebuilt image, which skips builds entirely. A monorepo sets `build_path`.
4. `configure_app_build`. Nixpacks auto-detects most stacks; Dockerfile and static are there when
   the repo calls for them.
5. `set_service_env` with the complete variable block.
6. `validate_domain`, then `add_domain` on the port the container listens on. No domain ready yet?
   `generate_domain` gives a free hostname for testing.
7. `service_action` with `deploy`, then poll `list_deployments`. On `error`, read
   `deployment_logs` and switch to the troubleshoot playbook.

## Using them directly

You can read one yourself, which is a decent way to learn how Dokploy expects things to be done:

```
Show me the deploy playbook
```

```
Read the troubleshoot playbook, then tell me why checkout is down
```
