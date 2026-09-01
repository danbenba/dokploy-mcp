import DokployClient from './client.js'
import { DokployApiError } from './errors.js'

export interface DokployCaller {
  readonly instanceUrl: string
  call(path: string, method: 'GET' | 'POST', params?: Record<string, unknown>): Promise<unknown>
  get(path: string, params?: Record<string, unknown>): Promise<unknown>
  post(path: string, params?: Record<string, unknown>): Promise<unknown>
}

export interface OrganizationCredential {
  id: string
  name: string | null
  apiKey: string
}

export interface OrganizationClient {
  id: string
  name: string | null
  client: DokployCaller
}

const FALLBACK_STATUSES = new Set([401, 403, 404])

export class DokployOrgPool implements DokployCaller {
  readonly organizations: OrganizationClient[]
  private readonly baseUrl: string

  constructor(baseUrl: string, credentials: OrganizationCredential[], timeoutMs?: number) {
    if (credentials.length === 0) {
      throw new Error('DokployOrgPool requires at least one organization credential.')
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.organizations = credentials.map((credential) => ({
      id: credential.id,
      name: credential.name,
      client: new DokployClient({ baseUrl, apiKey: credential.apiKey, timeoutMs }),
    }))
  }

  get instanceUrl(): string {
    return this.baseUrl
  }

  clientFor(organizationId: string): DokployCaller | null {
    return (
      this.organizations.find((organization) => organization.id === organizationId)?.client ?? null
    )
  }

  async call(
    path: string,
    method: 'GET' | 'POST',
    params?: Record<string, unknown>
  ): Promise<unknown> {
    let firstError: unknown
    for (const organization of this.organizations) {
      try {
        return await organization.client.call(path, method, params)
      } catch (error) {
        if (
          this.organizations.length === 1 ||
          !(error instanceof DokployApiError) ||
          !FALLBACK_STATUSES.has(error.status)
        ) {
          throw error
        }
        firstError ??= error
      }
    }
    throw firstError
  }

  get(path: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.call(path, 'GET', params)
  }

  post(path: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.call(path, 'POST', params)
  }
}
