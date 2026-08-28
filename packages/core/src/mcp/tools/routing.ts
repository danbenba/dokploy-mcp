import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { textResult } from '../helpers.js'

export function register(server: McpServer, context: McpContext): void {
  if (allows(context, 'create')) {
    server.registerTool(
      'publish_port',
      {
        title: 'Publish a raw port',
        description:
          'Publish a container port directly on the host, bypassing Traefik. Use it for TCP or UDP services that are not HTTP, such as a game server or an SMTP relay. Web applications should get a domain instead.',
        inputSchema: {
          application_id: z.string().min(1),
          published_port: z.number().int().min(1).max(65_535).describe('Port on the host.'),
          target_port: z
            .number()
            .int()
            .min(1)
            .max(65_535)
            .describe('Port the application listens on inside the container.'),
          protocol: z.enum(['tcp', 'udp']).optional(),
          publish_mode: z.enum(['ingress', 'host']).optional(),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        return textResult(
          await context.client.post('/port.create', {
            applicationId: input.application_id,
            publishedPort: input.published_port,
            targetPort: input.target_port,
            protocol: input.protocol ?? 'tcp',
            publishMode: input.publish_mode ?? 'ingress',
          })
        )
      }
    )

    server.registerTool(
      'add_redirect',
      {
        title: 'Add a redirect',
        description:
          'Add a Traefik redirect in front of an application. The classic case is sending www to the apex domain: regex ^https?://www\\.(.+) with replacement https://$1 and permanent true.',
        inputSchema: {
          application_id: z.string().min(1),
          regex: z.string().min(1),
          replacement: z.string().min(1),
          permanent: z.boolean().optional().describe('true issues a 308, false a 307.'),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        return textResult(
          await context.client.post('/redirects.create', {
            applicationId: input.application_id,
            regex: input.regex,
            replacement: input.replacement,
            permanent: input.permanent ?? true,
          })
        )
      }
    )

    server.registerTool(
      'add_basic_auth',
      {
        title: 'Protect an application with basic auth',
        description:
          'Put HTTP basic authentication in front of every domain of an application. Useful for staging environments and internal dashboards that have no authentication of their own.',
        inputSchema: {
          application_id: z.string().min(1),
          username: z.string().min(1),
          password: z.string().min(1),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        return textResult(
          await context.client.post('/security.create', {
            applicationId: input.application_id,
            username: input.username,
            password: input.password,
          })
        )
      }
    )
  }

  if (allows(context, 'delete')) {
    server.registerTool(
      'delete_published_port',
      {
        title: 'Unpublish a port',
        description:
          'Remove a published host port from an application, so the service is no longer reachable outside Traefik.',
        inputSchema: {
          port_id: z.string().min(1),
        },
      },
      async ({ port_id }) => {
        requireScope(context, 'delete')
        return textResult(await context.client.post('/port.delete', { portId: port_id }))
      }
    )

    server.registerTool(
      'delete_redirect',
      {
        title: 'Delete a redirect',
        description:
          'Remove a redirect rule from an application, so the matching requests are served directly again.',
        inputSchema: {
          redirect_id: z.string().min(1),
        },
      },
      async ({ redirect_id }) => {
        requireScope(context, 'delete')
        return textResult(await context.client.post('/redirects.delete', { redirectId: redirect_id }))
      }
    )

    server.registerTool(
      'delete_basic_auth',
      {
        title: 'Remove basic auth',
        description:
          'Remove an HTTP basic authentication credential from an application. Removing the last one leaves every domain unprotected.',
        inputSchema: {
          security_id: z.string().min(1),
        },
      },
      async ({ security_id }) => {
        requireScope(context, 'delete')
        return textResult(await context.client.post('/security.delete', { securityId: security_id }))
      }
    )
  }
}
