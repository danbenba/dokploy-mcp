import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { summarizeEnvironment, summarizeProject, textResult } from '../helpers.js'

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List every project with its environments and all services inside them (id, name, type, status). This is the map of the whole Dokploy instance: start here to find any projectId, environmentId or service id.',
      inputSchema: {},
    },
    async () => {
      requireScope(context, 'read')
      const data = await context.client.get('/project.all')
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(data.map((project) => summarizeProject(project as Record<string, unknown>)))
    }
  )

  server.registerTool(
    'get_project',
    {
      title: 'Get one project',
      description:
        'Full detail of one project: its environments and every service with its current status.',
      inputSchema: {
        project_id: z.string().min(1),
      },
    },
    async ({ project_id }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/project.one', { projectId: project_id })
      if (!data || typeof data !== 'object') {
        return textResult(data)
      }
      const project = data as Record<string, unknown>
      return textResult({ ...summarizeProject(project), createdAt: project.createdAt ?? null })
    }
  )

  server.registerTool(
    'list_environments',
    {
      title: 'List environments of a project',
      description:
        'List the environments of a project with the services they contain. Services always live inside an environment, never directly inside a project.',
      inputSchema: {
        project_id: z.string().min(1),
      },
    },
    async ({ project_id }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/environment.byProjectId', { projectId: project_id })
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(
        data.map((environment) => summarizeEnvironment(environment as Record<string, unknown>))
      )
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'create_project',
      {
        title: 'Create a project',
        description:
          'Create a project. Dokploy automatically adds a "production" environment to it; the response includes that environment so you can immediately create services inside it.',
        inputSchema: {
          name: z.string().min(1),
          description: z.string().optional(),
        },
      },
      async ({ name, description }) => {
        requireScope(context, 'create')
        const project = (await context.client.post('/project.create', {
          name,
          description: description ?? null,
        })) as Record<string, unknown>
        const projectId = typeof project?.projectId === 'string' ? project.projectId : null
        let environments: unknown = null
        if (projectId) {
          const raw = await context.client.get('/environment.byProjectId', { projectId })
          environments = Array.isArray(raw)
            ? raw.map((environment) => summarizeEnvironment(environment as Record<string, unknown>))
            : raw
        }
        return textResult({ project, environments })
      }
    )

    server.registerTool(
      'create_environment',
      {
        title: 'Create an environment',
        description:
          'Create an additional environment inside a project, for example staging or preview. Every service belongs to an environment.',
        inputSchema: {
          project_id: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
        },
      },
      async ({ project_id, name, description }) => {
        requireScope(context, 'create')
        const result = await context.client.post('/environment.create', {
          projectId: project_id,
          name,
          description: description ?? null,
        })
        return textResult(result)
      }
    )
  }

  if (allows(context, 'delete')) {
    server.registerTool(
      'delete_project',
      {
        title: 'Delete a project',
        description:
          'Permanently delete a project and every environment, service and database inside it. Destructive and irreversible: confirm with the operator first, then pass confirm true.',
        inputSchema: {
          project_id: z.string().min(1),
          confirm: z.boolean().describe('Must be true. Everything inside the project is destroyed.'),
        },
      },
      async ({ project_id, confirm }) => {
        requireScope(context, 'delete')
        if (!confirm) {
          throw new Error(
            'Refusing to delete without confirm set to true: this removes every service and database in the project.'
          )
        }
        const result = await context.client.post('/project.remove', { projectId: project_id })
        return textResult(result)
      }
    )
  }
}
