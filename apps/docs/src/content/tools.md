Fifty curated tools cover the work you do in the panel every day. Two meta tools cover the rest of
the API, so an unusual request does not hit a wall.

Each tool declares the scope it needs. A tool outside your grant is not registered at all. See
[permissions](/permissions).

## Projects

| Tool | Scope | What it does |
|---|---|---|
| `list_projects` | `read` | Every project, its environments and all services inside them, across every granted organization. The map of the instance: start here to find any id |
| `get_project` | `read` | Full detail of one project |
| `list_environments` | `read` | Environments of a project |
| `create_project` | `create` | New project, with an optional `organization_id` |
| `create_environment` | `create` | New environment inside a project |
| `delete_project` | `delete` | Deletes the project and every service and database in it. Requires `confirm: true` |

## Applications

| Tool | Scope | What it does |
|---|---|---|
| `get_application` | `read` | Source, build, environment, domains, ports and mounts of one application |
| `service_logs` | `read` | Runtime container output: where a crash after a successful build appears |
| `create_application` | `create` | New application in an environment |
| `configure_app_source` | `deploy` | Wire a GitHub, plain git or docker image source |
| `configure_app_build` | `deploy` | Choose the build: Nixpacks, Dockerfile, Railpack, Heroku buildpacks, static |
| `set_service_env` | `deploy` | Replace the environment variables |
| `service_action` | `deploy` | Deploy, redeploy, start, stop or restart |
| `delete_service` | `delete` | Deletes an application, compose stack or database. Requires `confirm: true` |

## Compose

| Tool | Scope | What it does |
|---|---|---|
| `get_compose` | `read` | One compose stack and its settings |
| `compose_services` | `read` | Services declared inside a stack |
| `list_templates` | `read` | The one-click template catalog |
| `create_compose` | `create` | New compose stack |
| `deploy_template` | `create` | Deploy a catalog template into an environment |
| `update_compose_file` | `deploy` | Replace the compose file itself |

## Databases

| Tool | Scope | What it does |
|---|---|---|
| `get_database` | `read` | Credentials, status and connection detail |
| `create_database` | `create` | Provision postgres, mysql, mariadb, mongo, redis or libsql |
| `set_database_external_port` | `deploy` | Expose the engine port to clients outside the server |

Other services reach a database over the shared `dokploy-network`, using its `appName` as the
hostname on the engine's default port. An external port is only needed for a client outside the
server.

## Domains

| Tool | Scope | What it does |
|---|---|---|
| `list_domains` | `read` | Hostnames attached to a service |
| `validate_domain` | `read` | Check DNS before attaching, so a certificate request cannot fail silently |
| `add_domain` | `create` | Attach a hostname with Let's Encrypt |
| `generate_domain` | `create` | A free `traefik.me` style hostname for testing |
| `update_domain` | `deploy` | Change the port, path or certificate of a domain |
| `delete_domain` | `delete` | Detach a hostname |

A domain routes to the port the container **listens on**, never to a published host port. The wrong
port here is the usual cause of a 502.

## Deployments

| Tool | Scope | What it does |
|---|---|---|
| `list_deployments` | `read` | Build history with status and timestamps |
| `deployment_logs` | `read` | The build log: where a failure during a deployment is explained |
| `deployment_queue` | `read` | The global queue across the instance |
| `cancel_deployment` | `deploy` | Cancel or kill a running build |

Deployments are asynchronous. `service_action` returns as soon as the build is queued, so the result
comes from polling `list_deployments` until the status leaves `running`.

## Infrastructure

| Tool | Scope | What it does |
|---|---|---|
| `list_containers` | `read` | Docker containers on a server |
| `container_config` | `read` | The `docker inspect` output for one container |
| `list_servers` | `read` | Remote servers attached to the instance |
| `container_action` | `deploy` | Start, stop or restart a container directly |

## Storage

| Tool | Scope | What it does |
|---|---|---|
| `list_mounts` | `read` | Mounts attached to a service |
| `add_mount` | `create` | Volume, bind or file mount, for data that survives a redeploy |
| `delete_mount` | `delete` | Remove a mount |

## Routing

| Tool | Scope | What it does |
|---|---|---|
| `publish_port` | `create` | Raw TCP or UDP port, for traffic Traefik does not proxy |
| `add_redirect` | `create` | A redirect such as www to apex |
| `add_basic_auth` | `create` | HTTP basic auth in front of a service |
| `delete_published_port` | `delete` | Remove a published port |
| `delete_redirect` | `delete` | Remove a redirect |
| `delete_basic_auth` | `delete` | Remove a basic auth credential |

## Automation

| Tool | Scope | What it does |
|---|---|---|
| `list_schedules` | `read` | Cron jobs configured on the instance |
| `list_backups` | `read` | Configured database backups |
| `create_schedule` | `create` | A cron job running inside a container |
| `create_backup_destination` | `create` | Register an S3-compatible destination |
| `schedule_backup` | `create` | Recurring database backup to a destination |
| `run_schedule` | `deploy` | Run a cron job now, without waiting for its tick |
| `run_backup` | `deploy` | Run a backup now, to confirm the credentials work |
| `delete_schedule` | `delete` | Remove a cron job |

## Meta

| Tool | Scope | What it does |
|---|---|---|
| `dokploy_status` | — | The instance, the account and the organizations this connection reaches. Always available |
| `api_find` | `read` | Search all 554 Dokploy endpoints and return their exact parameter schemas |
| `dokploy_api` | `read` / `admin` | Call any endpoint. `read` covers GET, `admin` is required for POST |
| `playbook` | `read` | One of the five [playbooks](/playbooks) |

`api_find` exists so that `dokploy_api` never has to guess. Parameters come from Dokploy's own
OpenAPI document, regenerated from the spec, so a call is built from the real schema rather than
from a plausible-looking name.
