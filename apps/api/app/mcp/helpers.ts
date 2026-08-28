export const DB_ROUTERS: Record<string, { router: string; idParam: string }> = {
  postgres: { router: 'postgres', idParam: 'postgresId' },
  mysql: { router: 'mysql', idParam: 'mysqlId' },
  mariadb: { router: 'mariadb', idParam: 'mariadbId' },
  mongo: { router: 'mongo', idParam: 'mongoId' },
  redis: { router: 'redis', idParam: 'redisId' },
  libsql: { router: 'libsql', idParam: 'libsqlId' },
}

export const SERVICE_ROUTERS: Record<string, { router: string; idParam: string }> = {
  application: { router: 'application', idParam: 'applicationId' },
  compose: { router: 'compose', idParam: 'composeId' },
  ...DB_ROUTERS,
}

const SERVICE_ALIASES: Record<string, string> = {
  app: 'application',
  web: 'application',
  site: 'application',
  'docker-compose': 'compose',
  stack: 'compose',
  postgresql: 'postgres',
  pg: 'postgres',
  mongodb: 'mongo',
}

export const INTERNAL_PORTS: Record<string, number> = {
  postgres: 5432,
  mysql: 3306,
  mariadb: 3306,
  mongo: 27017,
  redis: 6379,
  libsql: 8080,
}

export const DEFAULT_DB_IMAGES: Record<string, string> = {
  postgres: 'postgres:16',
  mysql: 'mysql:8',
  mariadb: 'mariadb:11',
  mongo: 'mongo:7',
  redis: 'redis:7',
  libsql: 'ghcr.io/tursodatabase/libsql-server:latest',
}

export function resolveService(serviceType: string): { router: string; idParam: string } {
  const normalized = serviceType.trim().toLowerCase()
  const resolved = SERVICE_ALIASES[normalized] ?? normalized
  const entry = SERVICE_ROUTERS[resolved]
  if (!entry) {
    throw new Error(
      `Unknown service_type "${serviceType}". Use one of: ${Object.keys(SERVICE_ROUTERS).join(', ')}.`
    )
  }
  return entry
}

export function compact(payload: unknown): string {
  return JSON.stringify(payload, (_key, value) => (value === undefined ? null : value))
}

export function textResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: compact(payload) }] }
}

export function pick<T extends Record<string, unknown>>(
  source: T | null | undefined,
  ...keys: string[]
): Record<string, unknown> {
  if (!source || typeof source !== 'object') {
    return {}
  }
  const output: Record<string, unknown> = {}
  for (const key of keys) {
    const value = (source as Record<string, unknown>)[key]
    if (value !== undefined && value !== null) {
      output[key] = value
    }
  }
  return output
}

function summarizeService(kind: string, item: Record<string, unknown>): Record<string, unknown> {
  const idKey = `${kind}Id`
  const statusKey = `${kind}Status`
  const summary: Record<string, unknown> = {
    type: kind,
    id: item[idKey] ?? item.applicationId ?? null,
    name: item.name ?? null,
  }
  if (item[statusKey]) {
    summary.status = item[statusKey]
  }
  if (item.appName) {
    summary.appName = item.appName
  }
  return summary
}

const SERVICE_COLLECTIONS: Array<[string, string]> = [
  ['application', 'applications'],
  ['compose', 'compose'],
  ['postgres', 'postgres'],
  ['mysql', 'mysql'],
  ['mariadb', 'mariadb'],
  ['mongo', 'mongo'],
  ['redis', 'redis'],
  ['libsql', 'libsql'],
]

export function summarizeEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const services: Array<Record<string, unknown>> = []
  for (const [kind, key] of SERVICE_COLLECTIONS) {
    const collection = environment[key]
    if (!Array.isArray(collection)) {
      continue
    }
    for (const item of collection) {
      services.push(summarizeService(kind, item as Record<string, unknown>))
    }
  }
  return {
    environmentId: environment.environmentId ?? null,
    name: environment.name ?? null,
    services,
  }
}

export function summarizeProject(project: Record<string, unknown>): Record<string, unknown> {
  const environments = Array.isArray(project.environments) ? project.environments : []
  return {
    projectId: project.projectId ?? null,
    name: project.name ?? null,
    description: project.description ?? null,
    environments: environments.map((environment) =>
      summarizeEnvironment(environment as Record<string, unknown>)
    ),
  }
}
