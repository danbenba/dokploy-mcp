import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { pick, resolveService, textResult } from '../helpers.js'

const MOUNT_KEYS = [
  'mountId',
  'type',
  'hostPath',
  'volumeName',
  'filePath',
  'mountPath',
  'content',
  'serviceType',
]

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'list_mounts',
    {
      title: 'List mounts of a service',
      description:
        'List the volumes, bind mounts and mounted files attached to a service. Mounts are what survives a redeploy, so this is where persistent data lives.',
      inputSchema: {
        service_type: z
          .string()
          .describe('application, compose, postgres, mysql, mariadb, mongo, redis or libsql.'),
        service_id: z.string().min(1),
      },
    },
    async ({ service_type, service_id }) => {
      requireScope(context, 'read')
      const { router } = resolveService(service_type)
      const data = await context.client.get('/mounts.listByServiceId', {
        serviceType: router,
        serviceId: service_id,
      })
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(data.map((mount) => pick(mount as Record<string, unknown>, ...MOUNT_KEYS)))
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'add_mount',
      {
        title: 'Attach a mount',
        description:
          'Attach storage to a service. Use volume for data that must survive redeploys, bind to expose a host directory, and file to mount inline content as a configuration file. Redeploy the service afterwards for the mount to take effect.',
        inputSchema: {
          service_type: z.string(),
          service_id: z.string().min(1),
          type: z.enum(['volume', 'bind', 'file']),
          mount_path: z
            .string()
            .min(1)
            .describe('Path inside the container, for example /app/data or /etc/app/config.yaml.'),
          volume_name: z.string().optional().describe('Named volume, for type volume.'),
          host_path: z.string().optional().describe('Directory on the host, for type bind.'),
          content: z.string().optional().describe('File body, for type file.'),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        const { router } = resolveService(input.service_type)
        if (input.type === 'volume' && !input.volume_name) {
          throw new Error('A mount of type volume needs volume_name.')
        }
        if (input.type === 'bind' && !input.host_path) {
          throw new Error('A mount of type bind needs host_path.')
        }
        if (input.type === 'file' && input.content === undefined) {
          throw new Error('A mount of type file needs content.')
        }
        return textResult(
          await context.client.post('/mounts.create', {
            type: input.type,
            mountPath: input.mount_path,
            serviceId: input.service_id,
            serviceType: router,
            volumeName: input.volume_name ?? null,
            hostPath: input.host_path ?? null,
            content: input.content ?? null,
          })
        )
      }
    )
  }

  if (allows(context, 'delete')) {
    server.registerTool(
      'delete_mount',
      {
        title: 'Detach a mount',
        description:
          'Detach a mount from its service. The underlying named volume is not deleted, so data can be reattached later.',
        inputSchema: {
          mount_id: z.string().min(1),
        },
      },
      async ({ mount_id }) => {
        requireScope(context, 'delete')
        return textResult(await context.client.post('/mounts.remove', { mountId: mount_id }))
      }
    )
  }
}
