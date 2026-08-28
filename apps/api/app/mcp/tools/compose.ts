import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '#mcp/context'
import { pick, textResult } from '#mcp/helpers'

const COMPOSE_KEYS = [
  'composeId',
  'name',
  'appName',
  'description',
  'composeStatus',
  'sourceType',
  'composeType',
  'composePath',
  'repository',
  'owner',
  'branch',
  'customGitUrl',
  'autoDeploy',
  'environmentId',
  'serverId',
  'createdAt',
]

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'get_compose',
    {
      title: 'Get a compose stack',
      description:
        'Read one compose service: status, source, the compose file itself, its environment block and its domains.',
      inputSchema: {
        compose_id: z.string().min(1),
      },
    },
    async ({ compose_id }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/compose.one', { composeId: compose_id })
      if (!data || typeof data !== 'object') {
        return textResult(data)
      }
      const compose = data as Record<string, unknown>
      const domains = Array.isArray(compose.domains) ? compose.domains : []
      return textResult({
        ...pick(compose, ...COMPOSE_KEYS),
        composeFile: compose.composeFile ?? null,
        env: compose.env ?? null,
        domains: domains.map((domain) =>
          pick(domain as Record<string, unknown>, 'domainId', 'host', 'port', 'https', 'serviceName')
        ),
      })
    }
  )

  server.registerTool(
    'compose_services',
    {
      title: 'List services of a compose stack',
      description:
        'List the service names declared in a compose file. You need one of them as compose_service_name when attaching a domain.',
      inputSchema: {
        compose_id: z.string().min(1),
        refetch: z.boolean().optional(),
      },
    },
    async ({ compose_id, refetch }) => {
      requireScope(context, 'read')
      return textResult(
        await context.client.get('/compose.loadServices', {
          composeId: compose_id,
          type: refetch ? 'fetch' : 'cache',
        })
      )
    }
  )

  server.registerTool(
    'list_templates',
    {
      title: 'Browse the template catalog',
      description:
        'Browse the one-click open-source template catalog of Dokploy, such as n8n, Grafana, WordPress, Plausible or Supabase. Returns the template ids used by deploy_template.',
      inputSchema: {
        search: z.string().optional(),
      },
    },
    async ({ search }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/compose.templates')
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      let templates = data.map((template) =>
        pick(template as Record<string, unknown>, 'id', 'name', 'version', 'description', 'tags', 'links')
      )
      if (search) {
        const needle = search.toLowerCase()
        templates = templates.filter((template) =>
          [template.name, template.id, template.description]
            .map((value) => String(value ?? '').toLowerCase())
            .some((value) => value.includes(needle))
        )
      }
      return textResult({ count: templates.length, templates })
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'create_compose',
      {
        title: 'Create a compose stack',
        description:
          'Create a compose service in an environment. A service that should receive web traffic must join the external dokploy-network in the YAML, and must not publish ports 80 or 443 itself because Traefik owns them.',
        inputSchema: {
          environment_id: z.string().min(1),
          name: z.string().min(1),
          compose_file: z.string().optional().describe('Inline docker-compose YAML.'),
          description: z.string().optional(),
          server_id: z.string().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        const params: Record<string, unknown> = {
          environmentId: input.environment_id,
          name: input.name,
          description: input.description ?? null,
          composeType: 'docker-compose',
        }
        if (input.server_id) {
          params.serverId = input.server_id
        }
        if (input.compose_file) {
          params.composeFile = input.compose_file
        }
        return textResult(await context.client.post('/compose.create', params))
      }
    )

    server.registerTool(
      'deploy_template',
      {
        title: 'Deploy a template',
        description:
          'Deploy an open-source template into an environment in one call. Dokploy creates a compose service with sane defaults, generated secrets and a generated domain. Poll list_deployments on the returned composeId afterwards.',
        inputSchema: {
          environment_id: z.string().min(1),
          template_id: z.string().min(1),
          server_id: z.string().optional(),
        },
      },
      async ({ environment_id, template_id, server_id }) => {
        requireScope(context, 'create')
        const params: Record<string, unknown> = {
          environmentId: environment_id,
          id: template_id,
        }
        if (server_id) {
          params.serverId = server_id
        }
        return textResult(await context.client.post('/compose.deployTemplate', params))
      }
    )
  }

  if (allows(context, 'deploy')) {
    server.registerTool(
      'update_compose_file',
      {
        title: 'Replace the compose file',
        description:
          'Replace the inline docker-compose YAML of a compose service. Deploy the stack afterwards for the change to take effect.',
        inputSchema: {
          compose_id: z.string().min(1),
          compose_file: z.string().min(1),
        },
      },
      async ({ compose_id, compose_file }) => {
        requireScope(context, 'deploy')
        return textResult(
          await context.client.post('/compose.update', {
            composeId: compose_id,
            composeFile: compose_file,
            sourceType: 'raw',
          })
        )
      }
    )
  }
}
