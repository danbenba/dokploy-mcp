Dokploy MCP is an open-source [Model Context Protocol](https://modelcontextprotocol.io) server that
gives an AI assistant control of the [Dokploy](https://dokploy.com) panel you host yourself.

Ask for a deployment, a database, a domain or the reason a build failed, in your own words. The
assistant works through Dokploy's own HTTP API, with the permissions you granted and nothing more.

## What it is not

It is not a hosted PaaS, and it does not replace your panel. It is a bridge: your Dokploy instance
stays exactly where it is, under your control, and the server in front of it holds no account of
its own and keeps no database.

It is also not affiliated with Dokploy Technology, Inc. Dokploy MCP is an independent integration
released under the Apache 2.0 license.

## What the assistant can do

| Area | Tools |
|---|---|
| Projects | list, inspect, create and delete projects and environments |
| Applications | create, wire a GitHub, git or docker source, choose the build, set environment variables, deploy, restart |
| Compose | create stacks, replace the compose file, list services, deploy the one-click template catalog |
| Databases | provision postgres, mysql, mariadb, mongo, redis or libsql with generated credentials |
| Domains | attach hostnames with Let's Encrypt, validate DNS, generate a test domain, update or delete |
| Deployments | build history, build logs, the global queue, cancel a build |
| Infrastructure | docker containers, `docker inspect`, remote servers |
| Storage | volume, bind and file mounts for data that survives a redeploy |
| Routing | raw TCP and UDP ports, redirects such as www to apex, HTTP basic auth |
| Automation | cron jobs inside a container, S3 destinations, scheduled database backups |
| Everything else | `api_find` searches all 554 Dokploy endpoints, `dokploy_api` calls any of them |

Fifty curated tools cover the work you do every day, and the two meta tools cover everything else,
so an unusual request does not hit a wall. The full list is in the
[tool reference](/tools).

## Why it does not guess

Dokploy has rules that are easy to get wrong, and a general-purpose assistant gets them wrong
confidently. Five [playbooks](/playbooks) ship inside the server so the assistant follows the real
behaviour instead:

- build logs and runtime logs are different sources, and the failure you are chasing only appears
  in one of them;
- a domain routes to the port the container listens on, never to a published host port;
- services reach a database over the shared `dokploy-network`, using the database `appName` as the
  hostname;
- an application must bind `0.0.0.0`, not `localhost`, or nothing can reach it;
- deployments are asynchronous, so the result comes from polling, not from the call that started
  them.

## Three ways to connect

| | Best when | Guide |
|---|---|---|
| Hosted connector | You want the shortest path and no key to paste | [Hosted connector](/hosted-connector) |
| npm package | You already have an API key, or you work in an editor | [npm package](/npm-package) |
| Self-hosted | Every hop has to stay on your own infrastructure | [Self-hosting](/self-hosting) |

All three expose the same tools. They differ only in where the server runs and how it gets a key
for your panel.

## Where to go next

- [Quickstart](/quickstart) connects an assistant in about a minute.
- [Permissions](/permissions) explains the five scopes and how they are enforced twice.
- [Troubleshooting](/troubleshooting) covers the failures that come up most: 502s, a build that
  never starts, a domain stuck without a certificate.
