import { DokployAuthError, extractErrorMessage } from './errors.js'

export interface DokployAccount {
  name: string
  email: string
  image: string | null
  role: string | null
  organizationId: string | null
  organizationName: string | null
}

export interface CredentialSession {
  cookies: string
  twoFactorPending: boolean
}

const TIMEOUT_MS = 15_000

function mergeCookies(existing: string, setCookies: string[]): string {
  const jar = new Map<string, string>()
  const feed = (cookie: string) => {
    const pair = cookie.split(';')[0]
    const separator = pair.indexOf('=')
    if (separator > 0) {
      jar.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
    }
  }
  for (const pair of existing.split('; ')) {
    if (pair.includes('=')) {
      feed(pair)
    }
  }
  for (const cookie of setCookies) {
    feed(cookie)
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

async function authFetch(
  baseUrl: string,
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; cookies?: string }
): Promise<{ response: Response; cookies: string; text: string }> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    origin: baseUrl,
    referer: `${baseUrl}/`,
  }
  if (options.cookies) {
    headers.cookie = options.cookies
  }
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, init)
  } catch {
    throw new DokployAuthError('unreachable', `Could not reach the Dokploy panel at ${baseUrl}.`)
  }
  const text = await response.text()
  const cookies = mergeCookies(options.cookies ?? '', response.headers.getSetCookie())
  return { response, cookies, text }
}

export async function signInWithEmail(
  baseUrl: string,
  email: string,
  password: string
): Promise<CredentialSession> {
  const { response, cookies, text } = await authFetch(baseUrl, '/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password },
  })

  if (!response.ok) {
    const message = extractErrorMessage(response.status, text)
    if (/verified/i.test(message)) {
      throw new DokployAuthError(
        'email_not_verified',
        'This email is not verified on the Dokploy panel.'
      )
    }
    if (response.status === 401 || response.status === 400 || /invalid|credential/i.test(message)) {
      throw new DokployAuthError('invalid_credentials', 'Invalid email or password.')
    }
    throw new DokployAuthError('sign_in_failed', message)
  }

  let twoFactorPending = false
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    twoFactorPending = data.twoFactorRedirect === true
  } catch {
    twoFactorPending = false
  }
  if (!cookies) {
    throw new DokployAuthError(
      'sign_in_failed',
      'The panel accepted the login but did not return a session.'
    )
  }
  return { cookies, twoFactorPending }
}

export async function verifyTotpCode(
  baseUrl: string,
  cookies: string,
  code: string
): Promise<CredentialSession> {
  const result = await authFetch(baseUrl, '/api/auth/two-factor/verify-totp', {
    method: 'POST',
    body: { code },
    cookies,
  })
  if (!result.response.ok) {
    throw new DokployAuthError(
      'invalid_totp',
      extractErrorMessage(result.response.status, result.text) ||
        'Invalid two-factor authentication code.'
    )
  }
  return { cookies: result.cookies, twoFactorPending: false }
}

export async function verifyBackupCode(
  baseUrl: string,
  cookies: string,
  code: string
): Promise<CredentialSession> {
  const result = await authFetch(baseUrl, '/api/auth/two-factor/verify-backup-code', {
    method: 'POST',
    body: { code },
    cookies,
  })
  if (!result.response.ok) {
    throw new DokployAuthError(
      'invalid_backup_code',
      extractErrorMessage(result.response.status, result.text) || 'Invalid backup code.'
    )
  }
  return { cookies: result.cookies, twoFactorPending: false }
}

function pickOrganization(payload: unknown): { id: string | null; name: string | null } {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { id: null, name: null }
  }
  const first = payload[0] as Record<string, unknown>
  const id = (first.organizationId ?? first.id) as string | undefined
  const name = first.name as string | undefined
  return { id: id ?? null, name: name ?? null }
}

function toAccount(user: Record<string, unknown>, organization: { id: string | null; name: string | null }): DokployAccount {
  return {
    name: String(user.name ?? user.email ?? 'Dokploy user'),
    email: String(user.email ?? ''),
    image: typeof user.image === 'string' ? user.image : null,
    role: typeof user.role === 'string' ? user.role : null,
    organizationId: organization.id,
    organizationName: organization.name,
  }
}

export async function fetchAccountWithSession(
  baseUrl: string,
  cookies: string
): Promise<DokployAccount> {
  const session = await authFetch(baseUrl, '/api/auth/get-session', { cookies })
  if (!session.response.ok) {
    throw new DokployAuthError('session_invalid', 'The Dokploy session is no longer valid.')
  }

  let user: Record<string, unknown> = {}
  try {
    const data = JSON.parse(session.text) as { user?: Record<string, unknown> }
    user = data.user ?? {}
  } catch {
    user = {}
  }
  if (!user.email) {
    throw new DokployAuthError('session_invalid', 'The Dokploy session did not identify a user.')
  }

  const organizations = await authFetch(baseUrl, '/api/organization.all', { cookies })
  let organization = { id: null as string | null, name: null as string | null }
  if (organizations.response.ok) {
    try {
      organization = pickOrganization(JSON.parse(organizations.text))
    } catch {
      organization = { id: null, name: null }
    }
  }
  return toAccount(user, organization)
}

export async function createApiKeyWithSession(
  baseUrl: string,
  cookies: string,
  keyName: string,
  organizationId: string | null
): Promise<string> {
  const body: Record<string, unknown> = { name: keyName.slice(0, 32) }
  if (organizationId) {
    body.metadata = { organizationId }
  }
  const { response, text } = await authFetch(baseUrl, '/api/user.createApiKey', {
    method: 'POST',
    body,
    cookies,
  })
  if (!response.ok) {
    throw new DokployAuthError(
      'api_key_creation_failed',
      `The panel refused to create an API key: ${extractErrorMessage(response.status, text)}`
    )
  }
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    const key = data.key ?? data.apiKey
    if (typeof key === 'string' && key.length > 0) {
      return key
    }
  } catch {
    throw new DokployAuthError(
      'api_key_creation_failed',
      'The panel returned an unreadable response while creating the API key.'
    )
  }
  throw new DokployAuthError(
    'api_key_creation_failed',
    'The panel created the API key but did not return its value.'
  )
}

export async function fetchAccountWithApiKey(
  baseUrl: string,
  apiKey: string
): Promise<DokployAccount> {
  let response: Response
  let text: string
  try {
    response = await fetch(`${baseUrl}/api/user.get`, {
      headers: { 'x-api-key': apiKey, 'accept': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    text = await response.text()
  } catch {
    throw new DokployAuthError('unreachable', `Could not reach the Dokploy panel at ${baseUrl}.`)
  }

  if (response.status === 401 || response.status === 403) {
    throw new DokployAuthError('invalid_api_key', 'This API key was rejected by the Dokploy panel.')
  }
  if (!response.ok) {
    throw new DokployAuthError('invalid_api_key', extractErrorMessage(response.status, text))
  }

  let user: Record<string, unknown> = {}
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    user = (data.user as Record<string, unknown>) ?? data
  } catch {
    user = {}
  }
  return toAccount(user, { id: null, name: null })
}
