import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { pick, textResult } from '../helpers.js'

const DOMAIN_KEYS = [
  'domainId',
  'host',
  'port',
  'https',
  'path',
  'certificateType',
  'serviceName',
  'domainType',
  'applicationId',
  'composeId',
  'createdAt',
]

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'list_domains',
    {
      title: 'List domains of a service',
      description: 'List the domains attached to an application or a compose service.',
      inputSchema: {
        service_type: z.enum(['application', 'compose']),
        service_id: z.string().min(1),
      },
    },
    async ({ service_type, service_id }) => {
      requireScope(context, 'read')
      const data =
        service_type === 'application'
          ? await context.client.get('/domain.byApplicationId', { applicationId: service_id })
          : await context.client.get('/domain.byComposeId', { composeId: service_id })
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(data.map((domain) => pick(domain as Record<string, unknown>, ...DOMAIN_KEYS)))
    }
  )

  server.registerTool(
    'validate_domain',
    {
      title: 'Check domain DNS',
      description:
        'Check whether a domain already resolves to the Dokploy server. Do this before adding a real domain: Let’s Encrypt cannot issue a certificate until DNS points at the server.',
      inputSchema: {
        domain: z.string().min(1),
        server_ip: z.string().optional(),
      },
    },
    async ({ domain, server_ip }) => {
      requireScope(context, 'read')
      const params: Record<string, unknown> = { domain }
      if (server_ip) {
        params.serverIp = server_ip
      }
      return textResult(await context.client.get('/domain.validateDomain', params))
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'add_domain',
      {
        title: 'Attach a domain',
        description:
          'Attach a domain to an application or compose service. The port must be the port the application listens on inside its container, not a published host port; a wrong port is the usual cause of a 502. Traefik picks the domain up immediately, no redeploy needed.',
        inputSchema: {
          host: z.string().min(1).describe('Hostname such as app.example.com.'),
          service_type: z.enum(['application', 'compose']),
          service_id: z.string().min(1),
          port: z.number().int().min(1).max(65_535).optional(),
          https: z.boolean().optional(),
          certificate: z.enum(['letsencrypt', 'none', 'custom']).optional(),
          path: z.string().optional(),
          compose_service_name: z
            .string()
            .optional()
            .describe('Required for compose: which service in the compose file receives traffic.'),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        if (input.service_type === 'compose' && !input.compose_service_name) {
          throw new Error(
            'Compose domains require compose_service_name, the target service inside the compose file. List them with compose_services.'
          )
        }
        const https = input.https ?? true
        const params: Record<string, unknown> = {
          host: input.host,
          https,
          certificateType: https ? (input.certificate ?? 'letsencrypt') : 'none',
          path: input.path ?? '/',
          port: input.port ?? null,
          domainType: input.service_type,
        }
        if (input.service_type === 'application') {
          params.applicationId = input.service_id
        } else {
          params.composeId = input.service_id
          params.serviceName = input.compose_service_name
        }
        return textResult(await context.client.post('/domain.create', params))
      }
    )

    server.registerTool(
      'generate_domain',
      {
        title: 'Generate a test domain',
        description:
          'Generate a free traefik.me style domain for quick testing when the operator has no DNS record ready. Pass the returned host to add_domain.',
        inputSchema: {
          app_name: z.string().min(1).describe('The service appName, not its display name.'),
          server_id: z.string().optional(),
        },
      },
      async ({ app_name, server_id }) => {
        requireScope(context, 'create')
        const params: Record<string, unknown> = { appName: app_name }
        if (server_id) {
          params.serverId = server_id
        }
        return textResult(await context.client.post('/domain.generateDomain', params))
      }
    )
  }

  if (allows(context, 'deploy')) {
    server.registerTool(
      'update_domain',
      {
        title: 'Update a domain',
        description:
          'Update an existing domain. The host is always required by the API: pass the current host to keep it unchanged.',
        inputSchema: {
          domain_id: z.string().min(1),
          host: z.string().min(1),
          port: z.number().int().min(1).max(65_535).optional(),
          https: z.boolean().optional(),
          certificate: z.enum(['letsencrypt', 'none', 'custom']).optional(),
          path: z.string().optional(),
          compose_service_name: z.string().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'deploy')
        const params: Record<string, unknown> = { domainId: input.domain_id, host: input.host }
        if (input.port !== undefined) {
          params.port = input.port
        }
        if (input.https !== undefined) {
          params.https = input.https
        }
        if (input.certificate !== undefined) {
          params.certificateType = input.certificate
        }
        if (input.path !== undefined) {
          params.path = input.path
        }
        if (input.compose_service_name !== undefined) {
          params.serviceName = input.compose_service_name
        }
        return textResult(await context.client.post('/domain.update', params))
      }
    )
  }

  if (allows(context, 'delete')) {
    server.registerTool(
      'delete_domain',
      {
        title: 'Delete a domain',
        description:
        'Detach and delete a domain from its service. Traefik stops routing that hostname immediately, and any certificate issued for it is released.',
        inputSchema: {
          domain_id: z.string().min(1),
        },
      },
      async ({ domain_id }) => {
        requireScope(context, 'delete')
        return textResult(await context.client.post('/domain.delete', { domainId: domain_id }))
      }
    )
  }
}
