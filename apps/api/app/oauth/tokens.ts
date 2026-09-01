import { createHash, randomUUID } from 'node:crypto'
import { EncryptJWT, jwtDecrypt } from 'jose'
import config from '#config/dokploy_mcp'
import type { DokployAccount, Scope } from '@dokploy-mcp/core'

export interface ConnectionOrganization {
  id: string
  name: string | null
  apiKey: string
}

export interface DokployConnection {
  url: string
  host: string
  apiKey: string
  account: DokployAccount
  method: 'credentials' | 'api_key'
  organizations?: ConnectionOrganization[]
}

export interface FlowAuth {
  method: 'credentials' | 'api_key'
  account: DokployAccount
  cookies?: string
  apiKey?: string
}

export interface AuthorizationRequest {
  clientId: string
  clientName: string
  redirectUri: string
  state: string | null
  codeChallenge: string | null
  codeChallengeMethod: string | null
  scopes: Scope[]
  resource: string | null
}

export interface FlowPayload extends AuthorizationRequest {
  typ: 'flow'
  nonce: string
  auth?: FlowAuth
  pendingCookies?: string
  pendingUrl?: string
  pendingHost?: string
}

export interface CodePayload {
  typ: 'code'
  clientId: string
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: string | null
  scopes: Scope[]
  connection: DokployConnection
  nonce: string
}

export interface AccessPayload {
  typ: 'access'
  clientId: string
  scopes: Scope[]
  connection: DokployConnection
  sessionId?: string
}

export interface RefreshPayload {
  typ: 'refresh'
  clientId: string
  scopes: Scope[]
  connection: DokployConnection
  sessionId?: string
  jti?: string
}

export class TokenError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TokenError'
    this.code = code
  }
}

const ISSUER = 'dokploy-mcp'

const consumedIds = new Map<string, number>()
const revokedSessions = new Map<string, number>()

function pruneStore(store: Map<string, number>, now: number): void {
  for (const [key, expiry] of store) {
    if (expiry <= now) {
      store.delete(key)
    }
  }
}

export function consumeOnce(id: string, ttlSeconds: number): boolean {
  const now = Date.now()
  pruneStore(consumedIds, now)
  if (consumedIds.has(id)) {
    return false
  }
  consumedIds.set(id, now + ttlSeconds * 1000)
  return true
}

export function revokeSession(sessionId: string, ttlSeconds: number): void {
  const now = Date.now()
  pruneStore(revokedSessions, now)
  revokedSessions.set(sessionId, now + ttlSeconds * 1000)
}

export function isSessionRevoked(sessionId: string | undefined): boolean {
  if (!sessionId) {
    return false
  }
  pruneStore(revokedSessions, Date.now())
  return revokedSessions.has(sessionId)
}

export function resetTokenStores(): void {
  consumedIds.clear()
  revokedSessions.clear()
}

function encryptionKey(): Uint8Array {
  return new Uint8Array(createHash('sha256').update(config.tokenSecret).digest())
}

async function seal(payload: object, ttlSeconds: number): Promise<string> {
  return new EncryptJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${ttlSeconds}s`)
    .setJti(randomUUID())
    .encrypt(encryptionKey())
}

async function open<T>(token: string, expectedType: string): Promise<T> {
  let payload: Record<string, unknown>
  try {
    const result = await jwtDecrypt(token, encryptionKey(), { issuer: ISSUER })
    payload = result.payload as Record<string, unknown>
  } catch (error) {
    const expired = error instanceof Error && error.name === 'JWTExpired'
    throw new TokenError(
      expired ? 'expired' : 'invalid',
      expired ? 'This token has expired.' : 'This token is invalid.'
    )
  }
  if (payload.typ !== expectedType) {
    throw new TokenError('invalid', `Expected a ${expectedType} token.`)
  }
  return payload as T
}

export function createFlowPayload(request: AuthorizationRequest): FlowPayload {
  return { typ: 'flow', nonce: randomUUID(), ...request }
}

export function sealFlow(payload: FlowPayload): Promise<string> {
  return seal(payload, config.flowSessionTtl)
}

export function openFlow(token: string): Promise<FlowPayload> {
  return open<FlowPayload>(token, 'flow')
}

export function sealCode(payload: Omit<CodePayload, 'typ' | 'nonce'>): Promise<string> {
  return seal({ typ: 'code', nonce: randomUUID(), ...payload }, config.authCodeTtl)
}

export async function openCode(token: string): Promise<CodePayload> {
  const payload = await open<CodePayload>(token, 'code')
  if (!consumeOnce(`code:${payload.nonce}`, config.authCodeTtl)) {
    throw new TokenError('invalid_grant', 'This authorization code has already been used.')
  }
  return payload
}

export function sealAccess(payload: Omit<AccessPayload, 'typ'>): Promise<string> {
  return seal({ typ: 'access', ...payload }, config.accessTokenTtl)
}

export function openAccess(token: string): Promise<AccessPayload> {
  return open<AccessPayload>(token, 'access')
}

export function sealRefresh(payload: Omit<RefreshPayload, 'typ'>): Promise<string> {
  return seal({ typ: 'refresh', ...payload }, config.refreshTokenTtl)
}

export function openRefresh(token: string): Promise<RefreshPayload> {
  return open<RefreshPayload>(token, 'refresh')
}

export function verifyPkce(
  challenge: string | null,
  method: string | null,
  verifier: string | undefined
): void {
  if (!challenge) {
    return
  }
  if (!verifier) {
    throw new TokenError('invalid_grant', 'A code_verifier is required for this authorization code.')
  }
  const normalizedMethod = (method ?? 'plain').toUpperCase()
  let computed: string
  if (normalizedMethod === 'S256') {
    computed = createHash('sha256').update(verifier).digest('base64url')
  } else if (normalizedMethod === 'PLAIN') {
    computed = verifier
  } else {
    throw new TokenError('invalid_grant', `Unsupported code_challenge_method ${method}.`)
  }
  if (computed !== challenge) {
    throw new TokenError('invalid_grant', 'The code_verifier does not match the code_challenge.')
  }
}
