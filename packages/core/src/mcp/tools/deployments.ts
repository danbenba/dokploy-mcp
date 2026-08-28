import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { pick, textResult } from '../helpers.js'

const DEPLOYMENT_KEYS = [
  'deploymentId',
  'title',
  'description',
  'status',
  'startedAt',
  'finishedAt',
  'errorMessage',
  'createdAt',
]

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'list_deployments',
    {
      title: 'List deployments',
      description:
        'List the deployment history of a service, newest first. A deployment goes from running to done or error. After triggering a deploy, poll this until it leaves running, then read deployment_logs if it failed.',
      inputSchema: {
        service_type: z.enum([
          'application',
          'compose',
          'server',
          'schedule',
          'previewDeployment',
          'backup',
          'volumeBackup',
        ]),
        service_id: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ service_type, service_id, limit }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/deployment.allByType', {
        id: service_id,
        type: service_type,
      })
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(
        data
          .slice(0, limit ?? 10)
          .map((deployment) => pick(deployment as Record<string, unknown>, ...DEPLOYMENT_KEYS))
      )
    }
  )

  server.registerTool(
    'deployment_logs',
    {
      title: 'Read build logs',
      description:
        'Read the build log of one deployment: clone, build, image and release steps. This is where build failures are explained. For the running application output use service_logs instead.',
      inputSchema: {
        deployment_id: z.string().min(1),
        tail: z.number().int().min(1).max(10_000).optional(),
      },
    },
    async ({ deployment_id, tail }) => {
      requireScope(context, 'read')
      return textResult(
        await context.client.get('/deployment.readLogs', {
          deploymentId: deployment_id,
          tail: tail ?? 200,
        })
      )
    }
  )

  server.registerTool(
    'deployment_queue',
    {
      title: 'Inspect the deployment queue',
      description:
        'Show what is building right now across the whole instance. Useful when deployments appear stuck.',
      inputSchema: {},
    },
    async () => {
      requireScope(context, 'read')
      return textResult(await context.client.get('/deployment.queueList'))
    }
  )

  if (allows(context, 'deploy')) {
    server.registerTool(
      'cancel_deployment',
      {
        title: 'Cancel deployments',
        description:
          'Cancel the queued deployments of a service, and optionally kill the build that is currently running.',
        inputSchema: {
          service_type: z.enum(['application', 'compose']),
          service_id: z.string().min(1),
          kill_running_build: z.boolean().optional(),
        },
      },
      async ({ service_type, service_id, kill_running_build }) => {
        requireScope(context, 'deploy')
        const idParam = service_type === 'application' ? 'applicationId' : 'composeId'
        const output: Record<string, unknown> = {
          cancelled: await context.client.post(`/${service_type}.cancelDeployment`, {
            [idParam]: service_id,
          }),
        }
        if (kill_running_build) {
          output.killed = await context.client.post(`/${service_type}.killBuild`, {
            [idParam]: service_id,
          })
        }
        return textResult(output)
      }
    )
  }
}
