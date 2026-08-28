export type Scope = 'read' | 'deploy' | 'create' | 'delete' | 'admin'

export interface ScopeDefinition {
  id: Scope
  label: string
  description: string
  risky: boolean
}

export const SCOPE_DEFINITIONS: ScopeDefinition[] = [
  {
    id: 'read',
    label: 'Read your infrastructure',
    description:
      'List projects, environments, services, domains and deployments, and read build and runtime logs.',
    risky: false,
  },
  {
    id: 'deploy',
    label: 'Deploy and operate services',
    description:
      'Trigger deployments, start, stop and restart services, and change environment variables, sources and build settings.',
    risky: false,
  },
  {
    id: 'create',
    label: 'Create resources',
    description:
      'Create projects, environments, applications, compose stacks, databases and domains.',
    risky: false,
  },
  {
    id: 'delete',
    label: 'Delete resources',
    description: 'Permanently delete projects, services and domains, including database volumes.',
    risky: true,
  },
  {
    id: 'admin',
    label: 'Full API access',
    description:
      'Call any Dokploy API endpoint, including server settings, backups, registries and user management.',
    risky: true,
  },
]

export const ALL_SCOPES: Scope[] = SCOPE_DEFINITIONS.map((scope) => scope.id)

export const DEFAULT_SCOPES: Scope[] = ['read', 'deploy', 'create']

export function isScope(value: string): value is Scope {
  return (ALL_SCOPES as string[]).includes(value)
}

export function sanitizeScopes(requested: string[] | undefined): Scope[] {
  if (!requested || requested.length === 0) {
    return [...DEFAULT_SCOPES]
  }
  const valid = requested.filter(isScope)
  return valid.length > 0 ? [...new Set(valid)] : [...DEFAULT_SCOPES]
}

export function parseScopeParam(scope: string | undefined | null): Scope[] {
  if (!scope) {
    return [...DEFAULT_SCOPES]
  }
  return sanitizeScopes(scope.split(/[\s+]+/).filter(Boolean))
}

export function formatScopeParam(scopes: Scope[]): string {
  return scopes.join(' ')
}

export function hasScope(granted: string[], required: Scope): boolean {
  if (granted.includes('admin')) {
    return true
  }
  if (granted.includes(required)) {
    return true
  }
  if (required === 'read') {
    return granted.some(isScope)
  }
  return false
}

export function describeScopes(scopes: Scope[]): ScopeDefinition[] {
  return SCOPE_DEFINITIONS.filter((definition) => scopes.includes(definition.id))
}
