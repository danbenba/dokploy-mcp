export const PLAYBOOK_NAMES = ['deploy', 'troubleshoot', 'database', 'template', 'domains'] as const

export type PlaybookName = (typeof PLAYBOOK_NAMES)[number]

const DEPLOY = `# Playbook: deploy — put a site/app online from zero

Follow the steps in order. Every step names the exact tool. Don't ask the
operator for values that have defaults — act, then report.

## 0. Preflight
- \`dokploy_status\` — connection + version. Abort with a clear message if auth fails.
- \`list_projects\` — check whether a suitable project/environment already exists
  (the operator saying "deploy X" usually means "in the obvious place").

## 1. Project & environment
- Existing project? Reuse its production \`environmentId\`.
- Else \`create_project(name)\` — the response includes the auto-created
  **production** environment; grab its \`environmentId\`.
- Only \`create_environment\` if the operator explicitly wants staging/preview.

## 2. The service shell
Decide the service kind:
- Single app/site from a repo or image → \`create_application(environment_id, name)\`.
- Multi-container stack (has a docker-compose.yml) → \`create_compose\` (see
  playbook('template') for the catalog flow instead).
- Just a database → playbook('database').

## 3. Source (applications)
Pick ONE provider for \`configure_app_source\`:
- **GitHub linked account**: first \`dokploy_api('/github.githubProviders')\` →
  \`githubId\`. If repos are needed: \`dokploy_api('/github.getGithubRepositories',
  params={githubId})\`; branches via \`/github.getGithubBranches\`.
  Then \`configure_app_source(provider='github', github_id, owner, repository, branch)\`.
- **Any git URL** (public repo or private+ssh key):
  \`configure_app_source(provider='git', git_url, branch)\`.
- **Prebuilt image**: \`configure_app_source(provider='docker',
  docker_image='ghcr.io/org/app:tag')\` — skips builds entirely.

Monorepo? Set \`build_path='apps/web'\` (github/git providers).

## 4. Build (git sources only)
\`configure_app_build\`:
- Default **nixpacks** — auto-detects Node/Python/Go/Rust/PHP/etc. Leave it
  unless there's a reason not to.
- Repo has a Dockerfile the operator wants used → \`build_type='dockerfile'\`
  (dockerfile_path defaults to ./Dockerfile).
- Plain HTML/SPA → \`build_type='static'\`, \`publish_directory='dist'\` (or build
  output dir), \`is_static_spa=true\` for client-side routing.

## 5. Environment variables
If the app needs config: \`set_service_env(service_type='application',
service_id, env="KEY=value\\nOTHER=value")\`. The string replaces the whole env
block — include ALL vars, not a diff.

## 6. Domain
- Real domain: optionally \`validate_domain(host)\` first (warn if DNS doesn't
  point at the server — Let's Encrypt will fail), then
  \`add_domain(host, service_type='application', service_id, port=<container
  port the app listens on>, https=true, certificate='letsencrypt')\`.
  Common ports: Next.js/Node 3000, Vite preview 4173, nginx/static 80,
  Django/uvicorn 8000, Laravel 8000/80.
- No domain ready: \`generate_domain(app_name=<appName>)\` → free traefik.me
  host → pass it to \`add_domain\` (with \`https=true, certificate='none'\`
  if TLS issuance is not possible on that host, otherwise defaults).

## 7. Deploy (ASYNC — never assume success)
- \`service_action(service_type='application', service_id, action='deploy')\`.
- Poll \`list_deployments(service_type='application', service_id)\` every ~10-20s:
  \`running\` → keep polling; \`error\` → \`deployment_logs(deploymentId)\` and jump
  to playbook('troubleshoot'); \`done\` → continue.

## 8. Verify
- \`get_application(service_id)\` — applicationStatus should be \`done\`/running,
  domain listed.
- \`service_logs(service_type='application', service_id, tail=50)\` — confirm the
  app actually started (look for its listen/ready line; crash-loops show here).
- Report to the operator: URL, status, and anything they must do (DNS record,
  secrets you left placeholder, etc.).

## Compose variant
Same shape: \`create_compose(environment_id, name, compose_file=...)\` →
\`set_service_env(service_type='compose', ...)\` if the YAML uses \${VARS} →
\`compose_services(compose_id)\` to see service names →
\`add_domain(..., service_type='compose', compose_service_name='web', port=...)\`
→ \`service_action(service_type='compose', action='deploy')\` → poll.
IMPORTANT: a compose service that should receive web traffic must join the
external \`dokploy-network\` in the YAML:

\`\`\`yaml
services:
  web:
    networks: [dokploy-network]
networks:
  dokploy-network:
    external: true
\`\`\``

const TROUBLESHOOT = `# Playbook: troubleshoot — deployment failed / site down / app broken

Logs first, hypotheses second. Two distinct log sources — pick the right one:

| Symptom | Log source |
|---|---|
| Deploy ended in \`error\` | \`deployment_logs(deploymentId)\` — BUILD log |
| Deploy \`done\` but site broken/502 | \`service_logs(...)\` — RUNTIME log |
| Deploy stuck in \`running\` forever | \`deployment_queue()\` + \`deployment_logs\` |

## 1. Establish the facts
- \`list_projects\` (or \`get_application\`/\`get_compose\`) — find the service, its
  status, its domains.
- \`list_deployments(service_type, service_id)\` — status + errorMessage of the
  latest deployment.

## 2. Build failures (\`status: error\`)
\`deployment_logs(deploymentId, tail=300)\` and look, in order, for:
- **Clone/auth errors** ("Authentication failed", "not found") → source config
  wrong. Re-check with \`get_application\`; fix via \`configure_app_source\`
  (branch typo? private repo without githubId/ssh key?).
- **Build tool errors** (nixpacks "could not detect", npm/yarn failures,
  missing lockfile) → wrong build type or missing files. Consider
  \`configure_app_build(build_type='dockerfile')\` if the repo has a Dockerfile,
  or fix env/buildArgs via \`set_service_env\`.
- **Out of disk** ("no space left on device") →
  \`dokploy_api('/settings.getDockerDiskUsage')\` then
  \`dokploy_api('/settings.cleanUnusedImages', method='POST')\` (or cleanAll),
  then redeploy.
- **Stuck queue** → \`deployment_queue()\`; cancel with
  \`cancel_deployment(service_type, service_id, kill_running_build=true)\` and
  redeploy.

Then \`service_action(action='deploy')\` again and poll.

## 3. Runtime failures (build ok, app down)
\`service_logs(service_type, service_id, tail=200)\`:
- **Crash on boot** (stack trace, "ECONNREFUSED", missing env) → fix env vars
  with \`set_service_env\` (remember: full replacement) → \`service_action('deploy')\`.
- **Repeated restarts** → \`list_containers(search=<appName>)\` +
  \`container_config(containerId)\` → check \`State.ExitCode\`, \`RestartCount\`,
  OOMKilled (exit 137 = out of memory → raise memory or fix leak).
- **Nothing in logs** → container may not exist:
  \`list_containers(search=<appName>)\`.

## 4. 502 / Bad Gateway on the domain
The build succeeded and the app runs, but Traefik can't reach it. Check in order:
1. \`get_application\` → the domain's **port** must equal the port the app
   LISTENS on inside the container (not a published port). Fix with
   \`update_domain(domain_id, host, port=<correct>)\`.
2. The app must listen on \`0.0.0.0\`, not \`127.0.0.1\` (visible in
   \`service_logs\` startup line). If it binds localhost, set the proper env
   (HOST=0.0.0.0) and redeploy.
3. Compose services: the target service must be on \`dokploy-network\`
   (external) and \`compose_service_name\` must match — \`compose_services\` +
   \`get_compose\` to verify the YAML.
4. DNS: \`validate_domain(host)\` — does the record point at this server?
5. TLS errors: certificate='letsencrypt' needs valid public DNS + port 80/443
   reachable. Behind Cloudflare proxy (orange cloud), use certificate='none'
   + Cloudflare TLS instead.

## 5. Instance-wide checks (many things broken)
- \`dokploy_status\` — panel healthy?
- \`dokploy_api('/settings.checkInfrastructureHealth')\` — traefik/redis/postgres
  of Dokploy itself.
- \`dokploy_api('/settings.getDockerDiskUsage')\` — disk pressure is the #1
  silent killer.
- \`list_servers\` — remote server down? (serverStatus)

## 6. Last resorts
- \`service_action(action='reload')\` (quick restart) or \`'stop'\` + \`'start'\`.
- \`service_action(action='redeploy')\` — rebuild from the last commit.
- Database container broken → \`service_action(db_type, action='rebuild')\`
  (recreates container, keeps the volume/data).
- Traefik misrouting after manual config edits →
  \`dokploy_api('/settings.reloadTraefik', method='POST')\`.

Always end with a verification (\`service_logs\` shows the ready line; the URL
answers 200) and report what was wrong + what you changed.`

const DATABASE = `# Playbook: database — provision a DB and wire an app to it

## 1. Create
\`create_database(environment_id, db_type, name)\` — db_type one of
postgres | mysql | mariadb | mongo | redis | libsql.
Passwords auto-generate; the response returns **credentials**, the
**internal_host** (= appName) and **internal_port**.

Defaults (override only if asked): postgres:16, mysql:8, mariadb:11, mongo:7,
redis:7.

## 2. Start it
\`service_action(service_type=<db_type>, service_id, action='deploy')\` — the
create call only stores config; deploy actually pulls the image and starts the
container. Poll \`list_deployments\`? Databases deploy fast; verify instead with
\`get_database\` (status) and \`service_logs(db_type, id, tail=30)\` (look for
"ready to accept connections" / equivalent).

## 3. Connection strings (INTERNAL networking — the normal case)
All Dokploy services share the \`dokploy-network\` docker network. From another
service in the SAME Dokploy instance, connect via the internal host:

- postgres: \`postgresql://<user>:<pass>@<appName>:5432/<databaseName>\`
- mysql/mariadb: \`mysql://<user>:<pass>@<appName>:3306/<databaseName>\`
- mongo: \`mongodb://<user>:<pass>@<appName>:27017\`
- redis: \`redis://default:<pass>@<appName>:6379\`

\`<appName>\` is the docker slug from \`get_database\` (NOT the display name).
Never use localhost, never use an external port for app→db on the same server.

## 4. Wire the app
\`set_service_env(service_type='application', service_id,
env="DATABASE_URL=postgresql://user:pass@appname:5432/db\\n...ALL other vars...")\`
— the env block is replaced wholesale; fetch the current env first via
\`get_application\` and merge. Then \`service_action(action='deploy')\` on the app.

## 5. External access (only when something OUTSIDE the server connects)
\`set_database_external_port(db_type, database_id, external_port=5432)\` —
publishes on the host. Warn the operator this exposes the DB to the network;
suggest a non-default port and firewall rules. Unpublish with
external_port=null.

## 6. Maintenance quick refs
- Change password: \`dokploy_api('/postgres.changePassword', method='POST',
  params={postgresId, databasePassword})\` (same shape for every engine).
- Container broken but data fine: \`service_action(db_type, action='rebuild')\`.
- Backups: Dokploy supports scheduled backups to S3-compatible destinations —
  \`api_find('backup create')\` and \`api_find('destination')\` for the schemas
  (destination.create first, then backup.create with the database id).`

const TEMPLATE = `# Playbook: template — one-click deploy from the open-source catalog

Dokploy ships a template catalog (n8n, Grafana, WordPress, Plausible, Umami,
Uptime-Kuma, Supabase, MinIO, ...). Templates become compose services with
auto-generated secrets and domains.

## 1. Find the template
\`list_templates(search='n8n')\` → note the template \`id\`.

## 2. Pick the destination
\`list_projects\` → choose/create the project & environmentId (playbook('deploy')
step 1).

## 3. Deploy
\`deploy_template(environment_id, template_id)\` — creates the compose service
and queues the deployment. The response includes the new composeId.

## 4. Follow the build
Poll \`list_deployments(service_type='compose', service_id=composeId)\` until
done/error; on error → playbook('troubleshoot') step 2.

## 5. Domain
Templates usually auto-generate a domain. Check \`get_compose(composeId)\` →
domains. To use a real domain instead: \`list_domains('compose', composeId)\`,
then \`update_domain(domain_id, host='real.example.com')\` or delete + \`add_domain\`
(remember compose_service_name and the app's internal port from the template's
compose file — \`get_compose\` shows the YAML).

## 6. Hand over
Report the URL and any default credentials the template generated (visible in
\`get_compose\` env block).`

const DOMAINS = `# Playbook: domains — routing, TLS, redirects, edge cases

Dokploy fronts everything with **Traefik**. A "domain" row = one Traefik router:
host (+ optional path) → the service's container port. Changes apply live —
no redeploy needed.

## Add a real domain (the 99% case)
1. DNS: an A/AAAA record for the host must point at the Dokploy server.
   \`validate_domain(host)\` checks this; \`dokploy_api('/settings.getIp')\` gives
   the server IP to tell the operator.
2. \`add_domain(host, service_type, service_id, port=<container listen port>,
   https=true, certificate='letsencrypt')\`.
3. Compose: also pass \`compose_service_name\` (from \`compose_services\`) and be
   sure that service joins the external \`dokploy-network\` in the YAML.

## TLS decision table
| Situation | https | certificate |
|---|---|---|
| Normal public domain | true | letsencrypt |
| Behind Cloudflare proxy (orange) | true | none (CF terminates; use Full mode) |
| Internal/testing, plain http | false | none |
| Own cert uploaded in Dokploy | true | custom (see api_find('certificates')) |

Let's Encrypt fails when DNS doesn't resolve to the server or ports 80/443 are
blocked — validate first, and read Traefik's view via
\`dokploy_api('/settings.readTraefikConfig')\` if issuance loops.

## Quick test domain without DNS
\`generate_domain(app_name)\` → traefik.me wildcard host that resolves to the
server → \`add_domain\` with it.

## Path routing & multiple domains
- Several domains per service are fine (www + apex, per-locale hosts...).
- \`path='/api'\` routes only that prefix; combine with different ports to split
  one host across services. \`internalPath\`/\`stripPath\` (via \`dokploy_api
  ('/domain.update')\`) rewrite the forwarded path.

## Redirects (e.g. www → apex)
Application-level: \`api_find('redirects')\` →
\`dokploy_api('/redirects.create', method='POST', params={applicationId, regex,
replacement, permanent})\` — Traefik redirectregex under the hood.
Typical www→apex: regex \`^https?://www\\.(.+)\` replacement \`https://$1\`.

## Security / auth in front of a service
- Basic auth & IP allow-lists: \`api_find('security')\` (security.create attaches
  basic-auth users to an application).
- SSO/forward-auth in front of any domain: \`api_find('forwardAuth')\`.

## When routing misbehaves
1. \`get_application\`/\`get_compose\` — is the domain row's port right?
2. \`service_logs\` — is the app listening on 0.0.0.0:<that port>?
3. \`dokploy_api('/application.readTraefikConfig', params={applicationId})\` —
   inspect the generated router.
4. \`dokploy_api('/settings.reloadTraefik', method='POST')\` after manual edits.`

export const PLAYBOOKS: Record<PlaybookName, string> = {
  deploy: DEPLOY,
  troubleshoot: TROUBLESHOOT,
  database: DATABASE,
  template: TEMPLATE,
  domains: DOMAINS,
}
