import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '#mcp/context'
import { DB_ROUTERS, DEFAULT_DB_IMAGES, INTERNAL_PORTS, pick, textResult } from '#mcp/helpers'

const DB_TYPES = ['postgres', 'mysql', 'mariadb', 'mongo', 'redis', 'libsql'] as const

function generatePassword(): string {
  return randomBytes(18).toString('base64url')
}

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'get_database',
    {
      title: 'Get a database',
      description:
        'Read one database service: status, credentials, image, published port and environment. The internal hostname other services use is its appName.',
      inputSchema: {
        db_type: z.enum(DB_TYPES),
        database_id: z.string().min(1),
      },
    },
    async ({ db_type, database_id }) => {
      requireScope(context, 'read')
      const { router, idParam } = DB_ROUTERS[db_type]
      const data = await context.client.get(`/${router}.one`, { [idParam]: database_id })
      if (!data || typeof data !== 'object') {
        return textResult(data)
      }
      return textResult({
        ...pick(
          data as Record<string, unknown>,
          idParam,
          'name',
          'appName',
          'description',
          `${db_type}Status`,
          'databaseName',
          'databaseUser',
          'databasePassword',
          'dockerImage',
          'externalPort',
          'env',
          'environmentId',
          'serverId',
          'createdAt'
        ),
        internal_port: INTERNAL_PORTS[db_type],
      })
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'create_database',
      {
        title: 'Create a database',
        description:
          'Create a database service and return its generated credentials. Creating only stores the configuration: deploy it with service_action to actually start the container. Other services connect over the shared dokploy-network using the database appName as hostname, so an external port is only needed for clients outside the server.',
        inputSchema: {
          environment_id: z.string().min(1),
          db_type: z.enum(DB_TYPES),
          name: z.string().min(1),
          database_name: z.string().optional(),
          database_user: z.string().optional(),
          database_password: z.string().optional(),
          docker_image: z.string().optional(),
          server_id: z.string().optional(),
          description: z.string().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        const { router } = DB_ROUTERS[input.db_type]
        const password = input.database_password ?? generatePassword()
        const fallbackName = input.name.replace(/-/g, '_')
        const params: Record<string, unknown> = {
          environmentId: input.environment_id,
          name: input.name,
          description: input.description ?? null,
          dockerImage: input.docker_image ?? DEFAULT_DB_IMAGES[input.db_type],
        }

        if (['postgres', 'mysql', 'mariadb'].includes(input.db_type)) {
          params.databaseName = input.database_name ?? fallbackName
          params.databaseUser = input.database_user ?? input.database_name ?? fallbackName
          params.databasePassword = password
        } else if (input.db_type === 'mongo') {
          params.databaseUser = input.database_user ?? 'mongo'
          params.databasePassword = password
        } else if (input.db_type === 'redis') {
          params.databasePassword = password
        } else {
          const slug = input.name.toLowerCase().replace(/[\s_]+/g, '-')
          params.appName = `${slug}-${randomBytes(3).toString('hex')}`
          params.description = input.description ?? ''
          params.databaseUser = input.database_user ?? 'admin'
          params.databasePassword = password
          params.sqldNode = 'primary'
          params.sqldPrimaryUrl = null
          params.enableNamespaces = false
          params.serverId = input.server_id ?? null
        }
        if (['mysql', 'mariadb'].includes(input.db_type)) {
          params.databaseRootPassword = generatePassword()
        }
        if (input.server_id) {
          params.serverId = input.server_id
        }

        const created = (await context.client.post(`/${router}.create`, params)) as Record<
          string,
          unknown
        >
        const credentials: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(params)) {
          if (key.startsWith('database') || key === 'dockerImage') {
            credentials[key] = value
          }
        }
        return textResult({
          created,
          credentials,
          internal_host: created?.appName ?? null,
          internal_port: INTERNAL_PORTS[input.db_type],
          next_step: `service_action with service_type "${input.db_type}" and action "deploy" starts the container.`,
        })
      }
    )
  }

  if (allows(context, 'deploy')) {
    server.registerTool(
      'set_database_external_port',
      {
        title: 'Publish a database port',
        description:
          'Publish a database on a host port so clients outside the server can connect, or pass null to unpublish it. Prefer internal networking: applications on the same Dokploy instance never need this.',
        inputSchema: {
          db_type: z.enum(DB_TYPES),
          database_id: z.string().min(1),
          external_port: z.number().int().min(1).max(65_535).nullable(),
        },
      },
      async ({ db_type, database_id, external_port }) => {
        requireScope(context, 'deploy')
        const { router, idParam } = DB_ROUTERS[db_type]
        if (db_type === 'libsql') {
          return textResult(
            await context.client.post('/libsql.saveExternalPorts', {
              libsqlId: database_id,
              externalPort: external_port,
              externalGRPCPort: null,
              externalAdminPort: null,
            })
          )
        }
        return textResult(
          await context.client.post(`/${router}.saveExternalPort`, {
            [idParam]: database_id,
            externalPort: external_port,
          })
        )
      }
    )
  }
}
