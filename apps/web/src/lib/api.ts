export interface ScopeDefinition {
  id: string
  label: string
  description: string
  risky: boolean
}

export interface FlowOrganization {
  id: string
  name: string | null
}

export interface FlowAccount {
  name: string
  email: string
  image: string | null
  role: string | null
  organizationId: string | null
  organizationName: string | null
  organizations: FlowOrganization[]
}

export interface FlowState {
  token: string
  stage: 'instance' | 'authenticate' | 'consent'
  brand: string
  client: { name: string }
  locked_instance: string | null
  requires_https: boolean
  instance: { url: string; host: string | null } | null
  account: FlowAccount | null
  method: 'credentials' | 'api_key' | null
  two_factor_pending: boolean
  requested_scopes: string[]
  scope_catalog: ScopeDefinition[]
  verified?: { url: string; host: string; is_cloud: boolean }
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const BASE_URL = (import.meta.env.VITE_MCP_URL ?? 'http://localhost:3333').replace(/\/+$/, '')

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the authorization server. Check your connection.')
  }

  const text = await response.text()
  let payload: Record<string, unknown> = {}
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      String(payload.error ?? 'request_failed'),
      String(payload.error_description ?? 'Something went wrong. Please try again.')
    )
  }
  return payload as T
}

export const api = {
  session: (flow: string) => post<FlowState>('/flow/session', { flow }),
  verify: (flow: string, url: string) => post<FlowState>('/flow/verify', { flow, url }),
  login: (flow: string, email: string, password: string) =>
    post<FlowState>('/flow/login', { flow, email, password }),
  secondFactor: (flow: string, code: string, mode: 'totp' | 'backup') =>
    post<FlowState>('/flow/second-factor', { flow, code, mode }),
  apiKey: (flow: string, apiKey: string) => post<FlowState>('/flow/api-key', { flow, api_key: apiKey }),
  avatar: (flow: string) => post<{ image: string | null }>('/flow/avatar', { flow }),
  logout: (flow: string) => post<FlowState>('/flow/logout', { flow }),
  consent: (flow: string, scopes: string[], organizations?: string[]) =>
    post<{ redirect_to: string; granted_scopes: string[] }>('/flow/consent', {
      flow,
      scopes,
      ...(organizations ? { organizations } : {}),
    }),
  deny: (flow: string) => post<{ redirect_to: string }>('/flow/deny', { flow }),
}
