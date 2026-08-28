import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { allows, requireScope, type McpContext } from '../context.js'
import { pick, textResult } from '../helpers.js'

const SCHEDULE_KEYS = [
  'scheduleId',
  'name',
  'description',
  'cronExpression',
  'command',
  'shellType',
  'scheduleType',
  'enabled',
  'createdAt',
]

export function register(server: McpServer, context: McpContext): void {
  server.registerTool(
    'list_schedules',
    {
      title: 'List scheduled jobs',
      description:
        'List the cron jobs attached to a service or to the server, with their expression, command and whether they are enabled.',
      inputSchema: {
        target_type: z.enum(['application', 'compose', 'server', 'dokploy-server']),
        target_id: z.string().min(1),
      },
    },
    async ({ target_type, target_id }) => {
      requireScope(context, 'read')
      const data = await context.client.get('/schedule.list', {
        id: target_id,
        scheduleType: target_type,
      })
      if (!Array.isArray(data)) {
        return textResult(data)
      }
      return textResult(
        data.map((schedule) => pick(schedule as Record<string, unknown>, ...SCHEDULE_KEYS))
      )
    }
  )

  server.registerTool(
    'list_backups',
    {
      title: 'List backups of a database',
      description:
        'List the scheduled backups configured for a database, with their cron expression, destination and retention.',
      inputSchema: {
        db_type: z.enum(['postgres', 'mysql', 'mariadb', 'mongo', 'libsql']),
        database_id: z.string().min(1),
      },
    },
    async ({ db_type, database_id }) => {
      requireScope(context, 'read')
      const idParam = `${db_type}Id`
      const data = await context.client.get(`/${db_type}.one`, { [idParam]: database_id })
      if (!data || typeof data !== 'object') {
        return textResult(data)
      }
      const backups = (data as Record<string, unknown>).backups
      if (!Array.isArray(backups)) {
        return textResult({ backups: [] })
      }
      return textResult({
        backups: backups.map((backup) =>
          pick(
            backup as Record<string, unknown>,
            'backupId',
            'schedule',
            'prefix',
            'database',
            'enabled',
            'keepLatestCount',
            'destinationId'
          )
        ),
      })
    }
  )

  if (allows(context, 'create')) {
    server.registerTool(
      'create_schedule',
      {
        title: 'Create a scheduled job',
        description:
          'Create a cron job that runs a command inside a service container. Test it immediately with run_schedule rather than waiting for the next tick.',
        inputSchema: {
          name: z.string().min(1),
          cron_expression: z
            .string()
            .min(1)
            .describe('Standard five field cron, for example 0 3 * * * for every day at 03:00.'),
          command: z.string().min(1),
          target_type: z.enum(['application', 'compose', 'server', 'dokploy-server']),
          target_id: z.string().min(1),
          shell_type: z.enum(['bash', 'sh']).optional(),
          description: z.string().optional(),
          enabled: z.boolean().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        const params: Record<string, unknown> = {
          name: input.name,
          cronExpression: input.cron_expression,
          command: input.command,
          shellType: input.shell_type ?? 'bash',
          scheduleType: input.target_type,
          description: input.description ?? '',
          enabled: input.enabled ?? true,
        }
        if (input.target_type === 'application') {
          params.applicationId = input.target_id
        } else if (input.target_type === 'compose') {
          params.composeId = input.target_id
        } else {
          params.serverId = input.target_id
        }
        return textResult(await context.client.post('/schedule.create', params))
      }
    )

    server.registerTool(
      'create_backup_destination',
      {
        title: 'Register a backup destination',
        description:
          'Register an S3 compatible bucket that backups are written to. Verify it with dokploy_api on /destination.testConnection before scheduling a backup against it.',
        inputSchema: {
          name: z.string().min(1),
          bucket: z.string().min(1),
          region: z.string().min(1),
          endpoint: z.string().min(1).describe('S3 endpoint URL of the provider.'),
          access_key: z.string().min(1),
          secret_access_key: z.string().min(1),
          provider: z.string().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        return textResult(
          await context.client.post('/destination.create', {
            name: input.name,
            provider: input.provider ?? 'S3',
            bucket: input.bucket,
            region: input.region,
            endpoint: input.endpoint,
            accessKey: input.access_key,
            secretAccessKey: input.secret_access_key,
            additionalFlags: '',
          })
        )
      }
    )

    server.registerTool(
      'schedule_backup',
      {
        title: 'Schedule a database backup',
        description:
          'Schedule recurring backups of a database to a registered destination. Run one immediately with run_backup to confirm the credentials work before trusting the schedule.',
        inputSchema: {
          db_type: z.enum(['postgres', 'mysql', 'mariadb', 'mongo', 'libsql']),
          database_id: z.string().min(1),
          destination_id: z.string().min(1),
          schedule: z.string().min(1).describe('Cron expression, for example 0 4 * * *.'),
          database: z.string().min(1).describe('Database name to dump, or all.'),
          prefix: z.string().optional().describe('Folder prefix inside the bucket.'),
          keep_latest_count: z.number().int().min(1).optional(),
          enabled: z.boolean().optional(),
        },
      },
      async (input) => {
        requireScope(context, 'create')
        const params: Record<string, unknown> = {
          schedule: input.schedule,
          prefix: input.prefix ?? `${input.db_type}/`,
          destinationId: input.destination_id,
          database: input.database,
          databaseType: input.db_type,
          enabled: input.enabled ?? true,
          backupType: 'database',
        }
        params[`${input.db_type}Id`] = input.database_id
        if (input.keep_latest_count !== undefined) {
          params.keepLatestCount = input.keep_latest_count
        }
        return textResult(await context.client.post('/backup.create', params))
      }
    )
  }

  if (allows(context, 'deploy')) {
    server.registerTool(
      'run_schedule',
      {
        title: 'Run a scheduled job now',
        description:
          'Run a cron job immediately, without waiting for its next tick. Use it to confirm a new schedule actually works.',
        inputSchema: {
          schedule_id: z.string().min(1),
        },
      },
      async ({ schedule_id }) => {
        requireScope(context, 'deploy')
        return textResult(
          await context.client.post('/schedule.runManually', { scheduleId: schedule_id })
        )
      }
    )

    server.registerTool(
      'run_backup',
      {
        title: 'Run a backup now',
        description:
          'Trigger one backup immediately for a configured backup entry, so you can verify the destination credentials before relying on the schedule.',
        inputSchema: {
          db_type: z.enum(['postgres', 'mysql', 'mariadb', 'mongo', 'libsql']),
          backup_id: z.string().min(1),
        },
      },
      async ({ db_type, backup_id }) => {
        requireScope(context, 'deploy')
        const procedures: Record<string, string> = {
          postgres: 'manualBackupPostgres',
          mysql: 'manualBackupMySql',
          mariadb: 'manualBackupMariadb',
          mongo: 'manualBackupMongo',
          libsql: 'manualBackupLibsql',
        }
        return textResult(
          await context.client.post(`/backup.${procedures[db_type]}`, { backupId: backup_id })
        )
      }
    )
  }

  if (allows(context, 'delete')) {
    server.registerTool(
      'delete_schedule',
      {
        title: 'Delete a scheduled job',
        description:
          'Remove a cron job from its service. The job stops running immediately and its history is discarded.',
        inputSchema: {
          schedule_id: z.string().min(1),
        },
      },
      async ({ schedule_id }) => {
        requireScope(context, 'delete')
        return textResult(await context.client.post('/schedule.delete', { scheduleId: schedule_id }))
      }
    )
  }
}
