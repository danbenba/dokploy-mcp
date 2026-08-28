import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpContext } from './context.js'
import * as applications from './tools/applications.js'
import * as automation from './tools/automation.js'
import * as compose from './tools/compose.js'
import * as databases from './tools/databases.js'
import * as deployments from './tools/deployments.js'
import * as domains from './tools/domains.js'
import * as infrastructure from './tools/infrastructure.js'
import * as meta from './tools/meta.js'
import * as projects from './tools/projects.js'
import * as routing from './tools/routing.js'
import * as storage from './tools/storage.js'

export const SERVER_NAME = 'dokploy'
export const SERVER_VERSION = '0.1.0'

export const SERVER_INSTRUCTIONS = `Control a Dokploy instance end to end: projects, environments, applications, compose stacks, databases, domains, deployments and logs. Dokploy is an open-source platform that runs Docker containers behind a Traefik reverse proxy with automatic TLS.

Hierarchy, never violate it: organization contains projects, a project contains environments, and every service lives inside an environment. A new project automatically gets a "production" environment. Services are applications (one container built from git or pulled as an image), compose stacks, and databases.

The standard flow to put a site online, detailed in playbook("deploy"): create_project, create_application, configure_app_source, configure_app_build, set_service_env, add_domain, then service_action with action "deploy". Deployments are asynchronous: poll list_deployments until the status leaves "running", and read deployment_logs when it ends in error.

Two different log sources. deployment_logs shows the build log, where failures during a deployment are explained. service_logs shows the runtime container output, where crashes after a successful build appear.

Domains route to the port the application listens on inside its container, never a published host port. A wrong port is the usual cause of a 502. Applications must bind 0.0.0.0 rather than localhost, and compose services that receive web traffic must join the external dokploy-network.

Databases are reached by other services over the shared dokploy-network using the database appName as hostname on the engine default port, so an external port is only needed for clients outside the server.

Beyond the curated tools, api_find searches the whole Dokploy API with exact parameter schemas and dokploy_api calls any endpoint, covering backups, schedules, notifications, certificates, registries and server settings. Never guess parameters: api_find is authoritative.

Act on sensible defaults rather than asking: nixpacks builds, Let's Encrypt certificates and generated passwords are the right choices unless the operator says otherwise. Only destructive tools require an explicit confirmation, and the permissions granted at connection time decide which tools exist at all: dokploy_status reports them.`

export function createMcpServer(context: McpContext): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS }
  )

  for (const module of [
    meta,
    projects,
    applications,
    compose,
    databases,
    domains,
    deployments,
    infrastructure,
    storage,
    routing,
    automation,
  ]) {
    module.register(server, context)
  }

  return server
}
