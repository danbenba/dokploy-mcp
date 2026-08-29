import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { pick, resolveService, textResult } from '../helpers.js'

const APPLICATION_KEYS = [
  'applicationId',
  'name',
  'appName',
  'description',
  'applicationStatus',
  'sourceType',
  'buildType',
  'autoDeploy',
  'branch',
  'repository',
  'owner',
  'customGitUrl',
  'customGitBranch',
  'dockerImage',
  'env',
  'serverId',
  'environmentId',
  'createdAt',
]

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'get_application',
    {
      title: 'Get an application',
      description:
        'Read one application: status, source, build type, environment variables, domains, published ports and mounts.',
      inputSchema: {
        application_id: z.string().min(1),
      },
    },
    async ({ application_id }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/application.one', { applicationId: application_id })
      if (!data || typeof data !== 'object') {
        return textResult(data)
      }
      const application = data as Record<string, unknown>
      const domains = Array.isArray(application.domains) ? application.domains : []
      const ports = Array.isArray(application.ports) ? application.ports : []
      const mounts = Array.isArray(application.mounts) ? application.mounts : []
      return textResult({
        ...pick(application, ...APPLICATION_KEYS),
        domains: domains.map((domain) =>
          pick(domain as Record<string, unknown>, 'domainId', 'host', 'port', 'https', 'path', 'certificateType')
        ),
        ports: ports.map((port) =>
          pick(port as Record<string, unknown>, 'portId', 'publishedPort', 'targetPort', 'protocol')
        ),
        mounts: mounts.map((mount) =>
          pick(mount as Record<string, unknown>, 'mountId', 'type', 'hostPath', 'volumeName', 'mountPath')
        ),
      })
    }
  )

  server.registerTool(
    'service_logs',
    {
      title: 'Read runtime logs',
      description:
        'Read the runtime container logs of a service (what docker logs shows). Use this when a service was deployed successfully but misbehaves or crashes. For build failures read deployment_logs instead.',
      inputSchema: {
        service_type: z
          .string()
          .describe('application, compose, postgres, mysql, mariadb, mongo, redis or libsql.'),
        service_id: z.string().min(1),
        tail: z.number().int().min(1).max(10_000).optional(),
        since: z.string().optional().describe('"all" or a window such as 15m, 2h, 1d.'),
        search: z.string().optional().describe('Only return lines containing this text.'),
      },
    },
    async ({ service_type, service_id, tail, since, search }) => {
      requireScope(context, 'read')
      const { router, idParam } = resolveService(service_type)
      const result = await context.client.get(`/${router}.readLogs`, {
        [idParam]: service_id,
        tail: tail ?? 100,
        since: since ?? 'all',
        search: search ?? null,
      })
      return textResult(result)
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'create_application',
      {
        title: 'Create an application',
        description:
          'Create an application inside an environment. It has no source yet: next call configure_app_source, then configure_app_build for git sources, then set_service_env if needed, then deploy it with service_action.',
        inputSchema: {
          environment_id: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
          app_name: z
            .string()
            .optional()
            .describe('Docker-safe slug, generated from the name when omitted.'),
          server_id: z
            .string()
            .optional()
            .describe('Deploy on a specific remote server; omit for the main Dokploy host.'),
        },
      },
      async ({ environment_id, name, description, app_name, server_id }) => {
        requireScope(context, 'create')
        const result = await context.client.post('/application.create', {
          environmentId: environment_id,
          name,
          description: description ?? null,
          appName: app_name ?? undefined,
          serverId: server_id ?? null,
        })
        return textResult(result)
      }
    )
  }

  if (allows(context, 'deploy')) {
    server.registerTool(
      'configure_app_source',
      {
        title: 'Set the application source',
        description:
          'Attach a code or image source to an application. Use github with a linked account (find githubId with dokploy_api on /github.githubProviders), git for any clone URL, or docker for a prebuilt image which skips the build entirely.',
        inputSchema: {
          application_id: z.string().min(1),
          provider: z.enum(['github', 'git', 'docker']),
          github_id: z.string().optional(),
          owner: z.string().optional(),
          repository: z.string().optional(),
          branch: z.string().optional(),
          build_path: z.string().optional().describe('Subdirectory of the repo, for monorepos.'),
          git_url: z.string().optional(),
          ssh_key_id: z.string().optional(),
          docker_image: z.string().optional(),
          registry_username: z.string().optional(),
          registry_password: z.string().optional(),
          registry_url: z.string().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'deploy')
        const { application_id: applicationId, provider } = input
        if (provider === 'github') {
          if (!input.github_id || !input.owner || !input.repository || !input.branch) {
            throw new Error(
              'provider "github" requires github_id, owner, repository and branch. List linked accounts with dokploy_api on /github.githubProviders.'
            )
          }
          return textResult(
            await context.client.post('/application.saveGithubProvider', {
              applicationId,
              githubId: input.github_id,
              owner: input.owner,
              repository: input.repository,
              branch: input.branch,
              buildPath: input.build_path ?? '/',
              triggerType: 'push',
              watchPaths: null,
            })
          )
        }
        if (provider === 'git') {
          if (!input.git_url || !input.branch) {
            throw new Error('provider "git" requires git_url and branch.')
          }
          return textResult(
            await context.client.post('/application.saveGitProvider', {
              applicationId,
              customGitUrl: input.git_url,
              customGitBranch: input.branch,
              customGitBuildPath: input.build_path ?? '/',
              customGitSSHKeyId: input.ssh_key_id ?? null,
              watchPaths: null,
            })
          )
        }
        if (!input.docker_image) {
          throw new Error('provider "docker" requires docker_image.')
        }
        return textResult(
          await context.client.post('/application.saveDockerProvider', {
            applicationId,
            dockerImage: input.docker_image,
            username: input.registry_username ?? null,
            password: input.registry_password ?? null,
            registryUrl: input.registry_url ?? null,
          })
        )
      }
    )

    server.registerTool(
      'configure_app_build',
      {
        title: 'Set the application build',
        description:
          'Choose how a git-sourced application is built into an image. Nixpacks is the default and auto-detects most stacks. Applications sourced from a docker image do not need this.',
        inputSchema: {
          application_id: z.string().min(1),
          build_type: z
            .enum(['nixpacks', 'railpack', 'dockerfile', 'heroku_buildpacks', 'paketo_buildpacks', 'static'])
            .optional(),
          dockerfile_path: z.string().optional(),
          docker_context_path: z.string().optional(),
          docker_build_stage: z.string().optional(),
          publish_directory: z.string().optional().describe('For static builds, e.g. dist.'),
          is_static_spa: z.boolean().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'deploy')
        const buildType = input.build_type ?? 'nixpacks'
        const dockerfile =
          buildType === 'dockerfile' ? (input.dockerfile_path ?? './Dockerfile') : null
        return textResult(
          await context.client.post('/application.saveBuildType', {
            applicationId: input.application_id,
            buildType,
            dockerfile,
            dockerContextPath: input.docker_context_path ?? '',
            dockerBuildStage: input.docker_build_stage ?? '',
            herokuVersion: null,
            railpackVersion: null,
            publishDirectory: input.publish_directory ?? null,
            isStaticSpa: input.is_static_spa ?? null,
          })
        )
      }
    )

    server.registerTool(
      'set_service_env',
      {
        title: 'Set environment variables',
        description:
          'Replace the whole environment variable block of a service, in env-file format with one KEY=value per line. Read the current block first and merge it, then deploy the service for the change to take effect.',
        inputSchema: {
          service_type: z.string(),
          service_id: z.string().min(1),
          env: z.string().describe('Full env file content, one KEY=value per line.'),
          build_args: z.string().optional().describe('Applications only: docker build arguments.'),
        },
      },
      async ({ service_type, service_id, env, build_args }) => {
        requireScope(context, 'deploy')
        const { router, idParam } = resolveService(service_type)
        const params: Record<string, unknown> = { [idParam]: service_id, env }
        if (router === 'application') {
          params.buildArgs = build_args ?? null
          params.buildSecrets = null
          params.createEnvFile = false
        }
        return textResult(await context.client.post(`/${router}.saveEnvironment`, params))
      }
    )

    server.registerTool(
      'service_action',
      {
        title: 'Deploy or control a service',
        description:
          'Control the lifecycle of any service: deploy, redeploy, start, stop, reload or rebuild. Deployments are asynchronous, so poll list_deployments until the status leaves "running", then read deployment_logs when it fails.',
        inputSchema: {
          service_type: z.string(),
          service_id: z.string().min(1),
          action: z.enum(['deploy', 'redeploy', 'start', 'stop', 'reload', 'rebuild']),
        },
      },
      async ({ service_type, service_id, action }) => {
        requireScope(context, 'deploy')
        const { router, idParam } = resolveService(service_type)
        const allowed: Record<string, string[]> = {
          application: ['deploy', 'redeploy', 'start', 'stop', 'reload'],
          compose: ['deploy', 'redeploy', 'start', 'stop'],
        }
        const valid = allowed[router] ?? ['deploy', 'start', 'stop', 'reload', 'rebuild']
        if (!valid.includes(action)) {
          throw new Error(`${router} supports ${valid.join(', ')} but not ${action}.`)
        }
        const params: Record<string, unknown> = { [idParam]: service_id }
        if (action === 'reload') {
          const service = (await context.client.get(`/${router}.one`, {
            [idParam]: service_id,
          })) as Record<string, unknown>
          params.appName = service?.appName ?? ''
        }
        return textResult(await context.client.post(`/${router}.${action}`, params))
      }
    )
  }

  if (allows(context, 'delete')) {
    server.registerTool(
      'delete_service',
      {
        title: 'Delete a service',
        description:
          'Permanently delete an application, compose stack or database. Databases lose their data. Destructive: confirm with the operator, then pass confirm true.',
        inputSchema: {
          service_type: z.string(),
          service_id: z.string().min(1),
          confirm: z.boolean(),
          delete_volumes: z.boolean().optional(),
        },
      },
      async ({ service_type, service_id, confirm, delete_volumes }) => {
        requireScope(context, 'delete')
        if (!confirm) {
          throw new Error('Refusing to delete without confirm set to true.')
        }
        const { router, idParam } = resolveService(service_type)
        const procedure = router === 'application' || router === 'compose' ? 'delete' : 'remove'
        const params: Record<string, unknown> = { [idParam]: service_id }
        if (router === 'compose') {
          params.deleteVolumes = delete_volumes ?? false
        }
        return textResult(await context.client.post(`/${router}.${procedure}`, params))
      }
    )
  }
}
