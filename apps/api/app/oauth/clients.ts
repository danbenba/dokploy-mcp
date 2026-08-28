import { createHash } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import config from '#config/dokploy_mcp'
import { TokenError } from '#oauth/tokens'

export interface OAuthClient {
  clientId: string
  clientName: string
  redirectUris: string[]
  tokenEndpointAuthMethod: string
  issuedAt: number
}

export interface ClientRegistrationInput {
  client_name?: unknown
  redirect_uris?: unknown
  token_endpoint_auth_method?: unknown
  grant_types?: unknown
  response_types?: unknown
}

export class RegistrationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'RegistrationError'
    this.code = code
  }
}

const ISSUER = 'dokploy-mcp-clients'

function signingKey(): Uint8Array {
  return new Uint8Array(createHash('sha256').update(`clients:${config.tokenSecret}`).digest())
}

function assertValidRedirectUri(value: string): void {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new RegistrationError('invalid_redirect_uri', `${value} is not a valid absolute URL.`)
  }
  if (parsed.hash) {
    throw new RegistrationError(
      'invalid_redirect_uri',
      'Redirect URIs must not contain a fragment.'
    )
  }
  const isLoopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1' ||
    parsed.hostname === '[::1]'
  if (parsed.protocol === 'http:' && !isLoopback) {
    throw new RegistrationError(
      'invalid_redirect_uri',
      'Plain http redirect URIs are only allowed on loopback addresses.'
    )
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const isPrivateScheme = /^[a-z][a-z0-9+.-]*:$/i.test(parsed.protocol)
    if (!isPrivateScheme) {
      throw new RegistrationError('invalid_redirect_uri', `Unsupported scheme ${parsed.protocol}.`)
    }
  }
}

export function normalizeRegistration(input: ClientRegistrationInput): {
  clientName: string
  redirectUris: string[]
  tokenEndpointAuthMethod: string
} {
  const uris = Array.isArray(input.redirect_uris) ? input.redirect_uris : []
  if (uris.length === 0) {
    throw new RegistrationError('invalid_redirect_uri', 'At least one redirect_uri is required.')
  }
  const redirectUris = uris.map((uri) => {
    if (typeof uri !== 'string' || uri.length === 0) {
      throw new RegistrationError('invalid_redirect_uri', 'Redirect URIs must be strings.')
    }
    assertValidRedirectUri(uri)
    return uri
  })
  if (redirectUris.length > 10) {
    throw new RegistrationError('invalid_client_metadata', 'Too many redirect URIs.')
  }

  const method =
    typeof input.token_endpoint_auth_method === 'string' ? input.token_endpoint_auth_method : 'none'
  if (method !== 'none') {
    throw new RegistrationError(
      'invalid_client_metadata',
      'Only public clients using PKCE are supported (token_endpoint_auth_method must be "none").'
    )
  }

  const rawName = typeof input.client_name === 'string' ? input.client_name.trim() : ''
  const clientName = (rawName || 'MCP client').slice(0, 80)

  return { clientName, redirectUris, tokenEndpointAuthMethod: method }
}

export async function issueClientId(client: {
  clientName: string
  redirectUris: string[]
  tokenEndpointAuthMethod: string
}): Promise<string> {
  return new SignJWT({
    name: client.clientName,
    uris: client.redirectUris,
    auth: client.tokenEndpointAuthMethod,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .sign(signingKey())
}

export async function resolveClient(clientId: string): Promise<OAuthClient> {
  let payload: Record<string, unknown>
  let issuedAt: number
  try {
    const result = await jwtVerify(clientId, signingKey(), { issuer: ISSUER })
    payload = result.payload as Record<string, unknown>
    issuedAt = (result.payload.iat as number | undefined) ?? 0
  } catch {
    throw new TokenError('invalid_client', 'Unknown client_id. Register the client again.')
  }
  const uris = Array.isArray(payload.uris) ? (payload.uris as string[]) : []
  if (uris.length === 0) {
    throw new TokenError('invalid_client', 'This client has no registered redirect URI.')
  }
  return {
    clientId,
    clientName: typeof payload.name === 'string' ? payload.name : 'MCP client',
    redirectUris: uris,
    tokenEndpointAuthMethod: typeof payload.auth === 'string' ? payload.auth : 'none',
    issuedAt,
  }
}

export function assertRedirectUriAllowed(client: OAuthClient, redirectUri: string): void {
  if (!client.redirectUris.includes(redirectUri)) {
    throw new TokenError(
      'invalid_grant',
      'The redirect_uri does not match any URI registered by this client.'
    )
  }
}
