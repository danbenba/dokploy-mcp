import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { spawn } from 'node:child_process'

export interface CliCredentials {
  url: string
  host: string
  account: { name: string; email: string }
  scopes: string[]
  organizations: { id: string; name: string | null; apiKey: string }[]
}

export interface LoginHandle {
  authorizeUrl: string
  waitForCredentials: () => Promise<CliCredentials>
  close: () => void
}

const CLIENT_NAME = 'Dokploy MCP CLI'

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function json<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()
  let body: Record<string, unknown> = {}
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    body = {}
  }
  if (!response.ok) {
    const description = body.error_description ?? body.error ?? `HTTP ${response.status}`
    throw new Error(String(description))
  }
  return body as T
}

function successPage(host: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connected</title><style>html{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#fafafa}main{text-align:center;padding:2rem}.check{width:64px;height:64px;border-radius:50%;background:#10b981;display:grid;place-items:center;margin:0 auto 1.25rem;animation:pop .45s cubic-bezier(.2,.9,.3,1.3)}svg{width:34px;height:34px}h1{font-size:1.25rem;margin:0 0 .5rem}p{margin:0;color:#a3a3a3;font-size:.9rem}@keyframes pop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}</style></head><body><main><div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></div><h1>Connected to ${host}</h1><p>You can close this window and return to your terminal.</p></main></body></html>`
}

function errorPage(message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Authorization failed</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,sans-serif;background:#0a0a0a;color:#fafafa}main{text-align:center;padding:2rem;max-width:32rem}h1{font-size:1.25rem}p{color:#a3a3a3}</style></head><body><main><h1>Authorization failed</h1><p>${message}</p><p>Return to your terminal and try again.</p></main></body></html>`
}

export async function startLogin(serverUrl: string): Promise<LoginHandle> {
  const base = serverUrl.replace(/\/+$/, '')
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const state = base64url(randomBytes(24))

  const server: Server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Could not open a local port for the login callback.')
  }
  const redirectUri = `http://127.0.0.1:${address.port}/callback`

  const registration = await json<{ client_id: string }>(`${base}/oauth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
    }),
  })

  const authorize = new URL(`${base}/oauth/authorize`)
  authorize.searchParams.set('client_id', registration.client_id)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('code_challenge', challenge)
  authorize.searchParams.set('code_challenge_method', 'S256')
  authorize.searchParams.set('scope', 'read deploy create delete admin')

  let settle: { resolve: (value: CliCredentials) => void; reject: (error: Error) => void } | null =
    null
  const result = new Promise<CliCredentials>((resolve, reject) => {
    settle = { resolve, reject }
  })

  server.on('request', async (request, response) => {
    const url = new URL(request.url ?? '/', redirectUri)
    if (url.pathname !== '/callback') {
      response.writeHead(404).end()
      return
    }
    const fail = (message: string) => {
      response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }).end(errorPage(message))
      settle?.reject(new Error(message))
    }
    if (url.searchParams.get('state') !== state) {
      fail('The login response did not match this session.')
      return
    }
    const denied = url.searchParams.get('error')
    if (denied) {
      fail(url.searchParams.get('error_description') ?? denied)
      return
    }
    const code = url.searchParams.get('code')
    if (!code) {
      fail('No authorization code was returned.')
      return
    }
    try {
      const tokens = await json<{ access_token: string }>(`${base}/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          code_verifier: verifier,
          client_id: registration.client_id,
          redirect_uri: redirectUri,
        }),
      })
      const credentials = await json<CliCredentials>(`${base}/cli/credentials`, {
        method: 'POST',
        headers: { authorization: `Bearer ${tokens.access_token}` },
      })
      response
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(successPage(credentials.host))
      settle?.resolve(credentials)
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  })

  return {
    authorizeUrl: authorize.toString(),
    waitForCredentials: () => result,
    close: () => server.close(),
  }
}

export function openBrowser(url: string): boolean {
  const platform = process.platform
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '""', url.replace(/&/g, '^&')] : [url]
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true })
    child.on('error', () => {})
    child.unref()
    return true
  } catch {
    return false
  }
}
