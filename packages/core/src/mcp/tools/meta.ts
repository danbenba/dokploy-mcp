import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { catalogCount, catalogVersion, describeEndpoint, findEndpoints } from '../catalog.js'
import { PLAYBOOKS, PLAYBOOK_NAMES, type PlaybookName } from '../playbooks.js'
import { requireScope, type McpContext } from '../context.js'
import { textResult } from '../helpers.js'

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'dokploy_status',
    {
      title: 'Connection status',
      description:
        'Report which Dokploy instance this connection controls, which account authorized it, which permissions were granted, and whether the panel is reachable. Call this first in a session or whenever a tool fails with an authorization error.',
      inputSchema: {},
    },
    async () => {
      const status: Record<string, unknown> = {
        instance: context.instanceUrl,
        account: {
          name: context.account.name,
          email: context.account.email,
          organization: context.account.organizationName,
        },
        granted_scopes: context.scopes,
        dokploy_catalog_endpoints: catalogCount(),
      }
      try {
        status.health = await context.client.get('/settings.health')
      } catch (error) {
        status.health_error = error instanceof Error ? error.message : String(error)
      }
      try {
        status.version = await context.client.get('/settings.getDokployVersion')
      } catch {
        status.version = null
      }
      return textResult(status)
    }
  )

  server.registerTool(
    'api_find',
    {
      title: 'Search the Dokploy API',
      description:
        'Search the full Dokploy API catalog and return matching endpoints with their exact parameter schemas (names, types, required flags, enums). Use it before dokploy_api for anything the curated tools do not cover, such as backups, schedules, notifications, certificates, registries or traefik configuration.',
      inputSchema: {
        query: z
          .string()
          .min(2)
          .describe('Keywords, for example "backup postgres", "schedule create", "traefik config".'),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ query, limit }) => {
      requireScope(context, 'read')
      const hits = findEndpoints(query, limit ?? 20)
      if (hits.length === 0) {
        return textResult({
          hits: [],
          hint: 'No endpoint matched. Try broader keywords, or a router name such as project, environment, application, compose, postgres, domain, deployment, docker, backup, schedule, server, settings or notification.',
        })
      }
      return textResult({ dokploy_version: catalogVersion(), hits })
    }
  )

  server.registerTool(
    'dokploy_api',
    {
      title: 'Call any Dokploy endpoint',
      description:
        'Call any endpoint of the Dokploy API directly. Discover the exact path and parameters with api_find first, never guess them. Read-only GET calls need the read permission; POST calls need the full API access permission.',
      inputSchema: {
        path: z.string().min(2).describe('Endpoint path such as /project.all or /application.deploy.'),
        method: z.enum(['GET', 'POST']).optional(),
        params: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async ({ path, method, params }) => {
      const known = describeEndpoint(path)
      const verb = known?.method ?? method ?? 'GET'
      requireScope(context, verb === 'GET' ? 'read' : 'admin')
      const result = await context.client.call(path, verb, params as Record<string, unknown>)
      return textResult(result)
    }
  )

  server.registerTool(
    'playbook',
    {
      title: 'Load an operating playbook',
      description:
        'Load a step-by-step playbook that encodes how Dokploy works: deploy (project to live site), troubleshoot (failed builds, crash loops, 502s), database (provision and wire a database), template (one-click catalog) and domains (routing, TLS, redirects). Follow its steps in order.',
      inputSchema: {
        name: z.enum(PLAYBOOK_NAMES),
      },
    },
    async ({ name }) => {
      requireScope(context, 'read')
      return { content: [{ type: 'text' as const, text: PLAYBOOKS[name as PlaybookName] }] }
    }
  )
}
