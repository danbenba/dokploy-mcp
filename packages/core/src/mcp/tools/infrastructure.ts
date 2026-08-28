import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '#mcp/context'
import { pick, textResult } from '#mcp/helpers'

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'list_containers',
    {
      title: 'List docker containers',
      description:
        'List the raw docker containers of a server with their image, state and ports. Useful when Dokploy reports a service as running but the container is actually crash looping, or to find orphans.',
      inputSchema: {
        server_id: z.string().optional().describe('Remote server id; omit for the main host.'),
        search: z.string().optional(),
      },
    },
    async ({ server_id, search }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/docker.getContainers', {
        serverId: server_id ?? null,
      })
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      let containers = data.map((container) =>
        pick(container as Record<string, unknown>, 'containerId', 'name', 'image', 'state', 'status', 'ports')
      )
      if (search) {
        const needle = search.toLowerCase()
        containers = containers.filter((container) =>
          [container.name, container.image]
            .map((value) => String(value ?? '').toLowerCase())
            .some((value) => value.includes(needle))
        )
      }
      return textResult({ count: containers.length, containers })
    }
  )

  server.registerTool(
    'container_config',
    {
      title: 'Inspect a container',
      description:
        'Full docker inspect of a container: mounts, environment, network, restart policy, health and exit code. This is the ground truth when a container keeps restarting; exit code 137 means it was killed, usually out of memory.',
      inputSchema: {
        container_id: z.string().min(1),
        server_id: z.string().optional(),
      },
    },
    async ({ container_id, server_id }) => {
      requireScope(context, 'read')
      return textResult(
        await context.client.get('/docker.getConfig', {
          containerId: container_id,
          serverId: server_id ?? null,
        })
      )
    }
  )

  server.registerTool(
    'list_servers',
    {
      title: 'List servers',
      description:
        'List the remote servers registered in Dokploy. Services created without a serverId run on the main Dokploy host.',
      inputSchema: {},
    },
    async () => {
      requireScope(context, 'read')
      const data = await context.client.get('/server.all')
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(
        data.map((server_) =>
          pick(
            server_ as Record<string, unknown>,
            'serverId',
            'name',
            'description',
            'ipAddress',
            'port',
            'username',
            'serverStatus',
            'createdAt'
          )
        )
      )
    }
  )

  if (allows(context, 'deploy')) {
    server.registerTool(
      'container_action',
      {
        title: 'Control a container',
        description:
          'Restart, start, stop or kill a raw docker container. Prefer service_action when the container belongs to a Dokploy service; this is the low level tool for unmanaged containers and emergency restarts.',
        inputSchema: {
          container_id: z.string().min(1),
          action: z.enum(['restart', 'start', 'stop', 'kill']),
          server_id: z.string().optional(),
        },
      },
      async ({ container_id, action, server_id }) => {
        requireScope(context, 'deploy')
        const procedures: Record<string, string> = {
          restart: 'restartContainer',
          start: 'startContainer',
          stop: 'stopContainer',
          kill: 'killContainer',
        }
        const params: Record<string, unknown> = { containerId: container_id }
        if (server_id) {
          params.serverId = server_id
        }
        return textResult(await context.client.post(`/docker.${procedures[action]}`, params))
      }
    )
  }
}
