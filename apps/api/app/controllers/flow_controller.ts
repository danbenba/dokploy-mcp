import { z } from 'zod'
import type { HttpContext } from '@adonisjs/core/http'
import config from '#config/dokploy_mcp'
import { DokployAuthError, describeScopes, sanitizeScopes, verifyDokployInstance } from '@dokploy-mcp/core'
import type { Scope } from '@dokploy-mcp/core'
import {
  openFlow,
  sealCode,
  sealFlow,
  TokenError,
  type DokployConnection,
  type FlowPayload,
} from '#oauth/tokens'
import {
  createApiKeyWithSession,
  fetchAccountWithApiKey,
  fetchAccountWithSession,
  signInWithEmail,
  verifyBackupCode,
  verifyTotpCode,
} from '@dokploy-mcp/core'

const flowSchema = z.object({ flow: z.string().min(10) })
const verifySchema = flowSchema.extend({ url: z.string().min(3).max(255) })
const loginSchema = flowSchema.extend({
  email: z.string().email(),
  password: z.string().min(1).max(200),
})
const secondFactorSchema = flowSchema.extend({
  code: z.string().min(4).max(64),
  mode: z.enum(['totp', 'backup']).optional(),
})
const apiKeySchema = flowSchema.extend({ api_key: z.string().min(8).max(400) })
const consentSchema = flowSchema.extend({ scopes: z.array(z.string()).optional() })

function stageOf(flow: FlowPayload): 'instance' | 'authenticate' | 'consent' {
  if (flow.connection) {
    return 'consent'
  }
  if (flow.pendingUrl || config.lockedDokployUrl) {
    return 'authenticate'
  }
  return 'instance'
}

function presentFlow(flow: FlowPayload, token: string) {
  const stage = stageOf(flow)
  return {
    token,
    stage,
    brand: config.brandName,
    client: { name: flow.clientName },
    locked_instance: config.lockedDokployUrl,
    requires_https: !config.allowInsecureDokploy,
    instance: flow.connection
      ? { url: flow.connection.url, host: flow.connection.host }
      : flow.pendingUrl
        ? { url: flow.pendingUrl, host: flow.pendingHost ?? null }
        : config.lockedDokployUrl
          ? { url: config.lockedDokployUrl, host: new URL(config.lockedDokployUrl).hostname }
          : null,
    account: flow.connection?.account ?? null,
    method: flow.connection?.method ?? null,
    two_factor_pending: Boolean(flow.pendingCookies && !flow.connection),
    requested_scopes: flow.scopes,
    scope_catalog: describeScopes(flow.scopes),
  }
}

export default class FlowController {
  private async load(token: string): Promise<FlowPayload> {
    return openFlow(token)
  }

  private async persist(flow: FlowPayload) {
    const token = await sealFlow(flow)
    return { flow, token }
  }

  private resolveInstanceUrl(flow: FlowPayload): string {
    const url = config.lockedDokployUrl ?? flow.pendingUrl
    if (!url) {
      throw new DokployAuthError(
        'missing_instance',
        'Enter the address of your Dokploy panel before signing in.'
      )
    }
    return url
  }

  async session({ request, response }: HttpContext) {
    const parsed = flowSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    return response.json(presentFlow(flow, parsed.data.flow))
  }

  async verify({ request, response }: HttpContext) {
    const parsed = verifySchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)

    const instance = await verifyDokployInstance(parsed.data.url, {
      allowPrivateNetworks: config.allowPrivateNetworks,
      allowInsecure: config.allowInsecureDokploy,
    })

    const next: FlowPayload = {
      ...flow,
      pendingUrl: instance.url,
      pendingHost: instance.host,
      pendingCookies: undefined,
      connection: undefined,
    }
    const persisted = await this.persist(next)
    return response.json({
      ...presentFlow(persisted.flow, persisted.token),
      verified: { url: instance.url, host: instance.host, is_cloud: instance.isCloud },
    })
  }

  async login({ request, response }: HttpContext) {
    const parsed = loginSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    const instanceUrl = this.resolveInstanceUrl(flow)

    const session = await signInWithEmail(instanceUrl, parsed.data.email, parsed.data.password)
    if (session.twoFactorPending) {
      const persisted = await this.persist({ ...flow, pendingCookies: session.cookies })
      return response.json({ ...presentFlow(persisted.flow, persisted.token), two_factor_pending: true })
    }
    return this.completeCredentialSession(response, flow, instanceUrl, session.cookies)
  }

  async secondFactor({ request, response }: HttpContext) {
    const parsed = secondFactorSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    const instanceUrl = this.resolveInstanceUrl(flow)
    if (!flow.pendingCookies) {
      throw new DokployAuthError('session_invalid', 'Sign in again to continue.')
    }
    const session =
      parsed.data.mode === 'backup'
        ? await verifyBackupCode(instanceUrl, flow.pendingCookies, parsed.data.code)
        : await verifyTotpCode(instanceUrl, flow.pendingCookies, parsed.data.code)
    return this.completeCredentialSession(response, flow, instanceUrl, session.cookies)
  }

  private async completeCredentialSession(
    response: HttpContext['response'],
    flow: FlowPayload,
    instanceUrl: string,
    cookies: string
  ) {
    const account = await fetchAccountWithSession(instanceUrl, cookies)
    const apiKey = await createApiKeyWithSession(
      instanceUrl,
      cookies,
      config.apiKeyLabel,
      account.organizationId
    )
    const connection: DokployConnection = {
      url: instanceUrl,
      host: new URL(instanceUrl).hostname,
      apiKey,
      account,
      method: 'credentials',
    }
    const persisted = await this.persist({
      ...flow,
      connection,
      pendingCookies: undefined,
    })
    return response.json(presentFlow(persisted.flow, persisted.token))
  }

  async apiKey({ request, response }: HttpContext) {
    const parsed = apiKeySchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    const instanceUrl = this.resolveInstanceUrl(flow)

    const account = await fetchAccountWithApiKey(instanceUrl, parsed.data.api_key)
    const connection: DokployConnection = {
      url: instanceUrl,
      host: new URL(instanceUrl).hostname,
      apiKey: parsed.data.api_key,
      account,
      method: 'api_key',
    }
    const persisted = await this.persist({ ...flow, connection, pendingCookies: undefined })
    return response.json(presentFlow(persisted.flow, persisted.token))
  }

  async consent({ request, response }: HttpContext) {
    const parsed = consentSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    if (!flow.connection) {
      return response
        .status(409)
        .json({ error: 'not_authenticated', error_description: 'Sign in to the panel first.' })
    }

    const requested = sanitizeScopes(parsed.data.scopes as string[] | undefined)
    const granted = requested.filter((scope) => flow.scopes.includes(scope)) as Scope[]
    if (granted.length === 0) {
      return response.status(400).json({
        error: 'invalid_scope',
        error_description: 'Select at least one permission to authorize.',
      })
    }

    const code = await sealCode({
      clientId: flow.clientId,
      redirectUri: flow.redirectUri,
      codeChallenge: flow.codeChallenge,
      codeChallengeMethod: flow.codeChallengeMethod,
      scopes: granted,
      connection: flow.connection,
    })

    const target = new URL(flow.redirectUri)
    target.searchParams.set('code', code)
    if (flow.state) {
      target.searchParams.set('state', flow.state)
    }
    return response.json({ redirect_to: target.toString(), granted_scopes: granted })
  }

  async deny({ request, response }: HttpContext) {
    const parsed = flowSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    const target = new URL(flow.redirectUri)
    target.searchParams.set('error', 'access_denied')
    target.searchParams.set('error_description', 'The user declined the authorization request.')
    if (flow.state) {
      target.searchParams.set('state', flow.state)
    }
    return response.json({ redirect_to: target.toString() })
  }
}

export { TokenError }
