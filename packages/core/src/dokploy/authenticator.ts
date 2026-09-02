import { DokployAuthError, extractErrorMessage } from './errors.js'

export interface DokployOrganization {
  id: string
  name: string | null
  logo?: string | null
  isDefault?: boolean
}

export interface DokployAccount {
  name: string
  email: string
  image: string | null
  role: string | null
  organizationId: string | null
  organizationName: string | null
  organizations: DokployOrganization[]
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

interface OrganizationEntry {
  id: string
  name: string | null
  logo: string | null
  isDefault: boolean
}

function parseOrganizations(payload: unknown): OrganizationEntry[] {
  if (!Array.isArray(payload)) {
    return []
  }
  const entries: OrganizationEntry[] = []
  for (const item of payload) {
    const row = item as Record<string, unknown>
    const id = (row.organizationId ?? row.id) as string | undefined
    if (typeof id !== 'string' || id.length === 0) {
      continue
    }
    const members = Array.isArray(row.members) ? (row.members as Record<string, unknown>[]) : []
    entries.push({
      id,
      name: typeof row.name === 'string' ? row.name : null,
      logo: sanitizeImage(row.logo),
      isDefault: members.some((member) => member.isDefault === true),
    })
  }
  return entries
}

function pickOrganization(
  entries: OrganizationEntry[],
  activeId: string | null
): { id: string | null; name: string | null } {
  const active = activeId ? entries.find((entry) => entry.id === activeId) : undefined
  if (active) {
    return { id: active.id, name: active.name }
  }
  if (activeId) {
    return { id: activeId, name: null }
  }
  const fallback = entries.find((entry) => entry.isDefault) ?? entries[0]
  return fallback ? { id: fallback.id, name: fallback.name } : { id: null, name: null }
}

function listOrganizations(
  entries: OrganizationEntry[],
  active: { id: string | null; name: string | null }
): DokployOrganization[] {
  const organizations: DokployOrganization[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    logo: entry.logo,
    isDefault: entry.isDefault,
  }))
  if (active.id && !organizations.some((organization) => organization.id === active.id)) {
    organizations.unshift({ id: active.id, name: active.name, logo: null, isDefault: false })
  }
  return organizations
}

function sanitizeImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    return null
  }
  return value.startsWith('https://') || value.startsWith('http://') ? value : null
}

function displayName(user: Record<string, unknown>): string {
  const words: string[] = []
  const seen = new Set<string>()
  for (const field of [user.firstName, user.lastName, user.name]) {
    if (typeof field !== 'string') {
      continue
    }
    for (const word of field.trim().split(/\s+/)) {
      const key = word.toLowerCase()
      if (word.length > 0 && !seen.has(key)) {
        seen.add(key)
        words.push(word)
      }
    }
  }
  if (words.length > 0) {
    return words.join(' ')
  }
  return String(user.email ?? 'Dokploy user')
}

function presentableImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4_000_000) {
    return null
  }
  if (value.startsWith('data:image/') || value.startsWith('https://') || value.startsWith('http://')) {
    return value
  }
  return null
}

function toAccount(
  user: Record<string, unknown>,
  role: string | null,
  organization: { id: string | null; name: string | null },
  organizations: DokployOrganization[]
): DokployAccount {
  return {
    name: displayName(user),
    email: String(user.email ?? ''),
    image: sanitizeImage(user.image),
    role,
    organizationId: organization.id,
    organizationName: organization.name,
    organizations,
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
  let activeOrganizationId: string | null = null
  try {
    const data = JSON.parse(session.text) as {
      user?: Record<string, unknown>
      session?: Record<string, unknown>
    }
    user = data.user ?? {}
    const active = data.session?.activeOrganizationId
    activeOrganizationId = typeof active === 'string' && active.length > 0 ? active : null
  } catch {
    user = {}
  }
  if (!user.email) {
    throw new DokployAuthError('session_invalid', 'The Dokploy session did not identify a user.')
  }

  const organizations = await authFetch(baseUrl, '/api/organization.all', { cookies })
  let entries: OrganizationEntry[] = []
  if (organizations.response.ok) {
    try {
      entries = parseOrganizations(JSON.parse(organizations.text))
    } catch {
      entries = []
    }
  }
  const role = typeof user.role === 'string' ? user.role : null
  const active = pickOrganization(entries, activeOrganizationId)
  return toAccount(user, role, active, listOrganizations(entries, active))
}

export async function signOut(baseUrl: string, cookies: string): Promise<void> {
  try {
    await authFetch(baseUrl, '/api/auth/sign-out', { method: 'POST', body: {}, cookies })
  } catch {
    return
  }
}

export async function fetchAvatarWithSession(
  baseUrl: string,
  cookies: string
): Promise<string | null> {
  const session = await authFetch(baseUrl, '/api/auth/get-session', { cookies })
  if (!session.response.ok) {
    throw new DokployAuthError('session_invalid', 'The Dokploy session is no longer valid.')
  }
  try {
    const data = JSON.parse(session.text) as { user?: Record<string, unknown> }
    return presentableImage(data.user?.image)
  } catch {
    return null
  }
}

export async function createApiKeyWithSession(
  baseUrl: string,
  cookies: string,
  keyName: string,
  organizationId: string | null
): Promise<string> {
  if (!organizationId) {
    throw new DokployAuthError(
      'api_key_creation_failed',
      'Could not determine your Dokploy organization.'
    )
  }
  const body: Record<string, unknown> = {
    name: keyName.trim().slice(0, 32),
    metadata: { organizationId },
    rateLimitEnabled: false,
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

async function fetchUserRowWithApiKey(
  baseUrl: string,
  apiKey: string
): Promise<Record<string, unknown>> {
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

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function fetchAccountWithApiKey(
  baseUrl: string,
  apiKey: string
): Promise<DokployAccount> {
  const row = await fetchUserRowWithApiKey(baseUrl, apiKey)
  const user = (row.user as Record<string, unknown>) ?? row
  const role =
    typeof row.role === 'string' ? row.role : typeof user.role === 'string' ? user.role : null
  const organizationId = typeof row.organizationId === 'string' ? row.organizationId : null
  const organizations = organizationId ? [{ id: organizationId, name: null }] : []
  return toAccount(user, role, { id: organizationId, name: null }, organizations)
}

export async function fetchAvatarWithApiKey(
  baseUrl: string,
  apiKey: string
): Promise<string | null> {
  const row = await fetchUserRowWithApiKey(baseUrl, apiKey)
  const user = (row.user as Record<string, unknown>) ?? row
  return presentableImage(user.image)
}
