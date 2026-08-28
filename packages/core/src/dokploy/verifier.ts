import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { normalizeBaseUrl } from '../url.js'
import { InstanceVerificationError } from './errors.js'

export interface VerifiedInstance {
  url: string
  host: string
  isCloud: boolean
}

export interface VerifyOptions {
  allowPrivateNetworks?: boolean
  allowInsecure?: boolean
  timeoutMs?: number
}

const PRIVATE_V4_RANGES = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^198\.(1[89])\./,
]

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) {
    return PRIVATE_V4_RANGES.some((range) => range.test(address))
  }
  if (family === 6) {
    const lower = address.toLowerCase()
    if (lower === '::' || lower === '::1') {
      return true
    }
    if (lower.startsWith('::ffff:')) {
      return isPrivateAddress(lower.slice(7))
    }
    return lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')
  }
  return false
}

async function assertReachableHost(host: string, allowPrivate: boolean): Promise<void> {
  if (allowPrivate) {
    return
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new InstanceVerificationError(
        'private_address',
        'This address points to a private network, which the public connector cannot reach.'
      )
    }
    return
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new InstanceVerificationError(
      'private_address',
      'Local hostnames cannot be reached by the public connector.'
    )
  }
  let records: Array<{ address: string }>
  try {
    records = await lookup(host, { all: true })
  } catch {
    throw new InstanceVerificationError(
      'dns',
      `Could not resolve ${host}. Check the address and its DNS records.`
    )
  }
  if (records.some((record) => isPrivateAddress(record.address))) {
    throw new InstanceVerificationError(
      'private_address',
      `${host} resolves to a private address, which the public connector cannot reach.`
    )
  }
}

function probe(url: string, timeoutMs: number): Promise<Response> {
  return fetch(url, {
    headers: { accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function verifyDokployInstance(
  input: string,
  options: VerifyOptions = {}
): Promise<VerifiedInstance> {
  let url: string
  try {
    url = normalizeBaseUrl(input)
  } catch {
    throw new InstanceVerificationError('invalid_url', 'This does not look like a valid URL.')
  }

  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' && !options.allowInsecure) {
    throw new InstanceVerificationError('insecure', 'Only https:// Dokploy panels are accepted.')
  }
  await assertReachableHost(parsed.hostname, options.allowPrivateNetworks ?? false)

  const timeoutMs = options.timeoutMs ?? 10_000

  let health: Response
  try {
    health = await probe(`${url}/api/health`, timeoutMs)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    throw new InstanceVerificationError(
      'unreachable',
      `Could not reach ${parsed.hostname}: ${timedOut ? 'the connection timed out' : 'the connection failed'}.`
    )
  }
  if (!health.ok) {
    throw new InstanceVerificationError(
      'not_dokploy',
      `${parsed.hostname} answered, but it does not expose the Dokploy health endpoint (HTTP ${health.status}).`
    )
  }

  let isCloud = false
  try {
    const response = await probe(`${url}/api/settings.isCloud`, timeoutMs)
    if (!response.ok) {
      throw new Error(`status ${response.status}`)
    }
    const body = (await response.json()) as unknown
    if (typeof body !== 'boolean') {
      throw new Error('unexpected body')
    }
    isCloud = body
  } catch {
    throw new InstanceVerificationError(
      'not_dokploy',
      `${parsed.hostname} does not answer like a Dokploy panel. Make sure the URL points at the panel itself.`
    )
  }

  return { url, host: parsed.hostname, isCloud }
}
