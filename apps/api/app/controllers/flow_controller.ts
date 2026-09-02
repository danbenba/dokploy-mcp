import { z } from 'zod'
import type { HttpContext } from '@adonisjs/core/http'
import config from '#config/dokploy_mcp'
import { DokployAuthError, describeScopes, isScope, verifyDokployInstance } from '@dokploy-mcp/core'
import type { Scope } from '@dokploy-mcp/core'
import {
  openFlow,
  sealCode,
  sealFlow,
  TokenError,
  type ConnectionOrganization,
  type DokployConnection,
  type FlowPayload,
} from '#oauth/tokens'
import {
  createApiKeyWithSession,
  fetchAccountWithApiKey,
  fetchAccountWithSession,
  fetchAvatarWithApiKey,
  fetchAvatarWithSession,
  signInWithEmail,
  signOut,
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
const consentSchema = flowSchema.extend({
  scopes: z.array(z.string()).optional(),
  organizations: z.array(z.string().min(1)).max(50).optional(),
})

function stageOf(flow: FlowPayload): 'instance' | 'authenticate' | 'consent' {
  if (flow.auth) {
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
    instance: flow.pendingUrl
      ? { url: flow.pendingUrl, host: flow.pendingHost ?? null }
      : config.lockedDokployUrl
        ? { url: config.lockedDokployUrl, host: new URL(config.lockedDokployUrl).hostname }
        : null,
    account: flow.auth?.account ?? null,
    method: flow.auth?.method ?? null,
    two_factor_pending: Boolean(flow.pendingCookies && !flow.auth),
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
      auth: undefined,
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
    const persisted = await this.persist({
      ...flow,
      auth: { method: 'credentials', account, cookies },
      pendingUrl: instanceUrl,
      pendingHost: new URL(instanceUrl).hostname,
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
    const persisted = await this.persist({
      ...flow,
      auth: { method: 'api_key', account, apiKey: parsed.data.api_key },
      pendingUrl: instanceUrl,
      pendingHost: new URL(instanceUrl).hostname,
      pendingCookies: undefined,
    })
    return response.json(presentFlow(persisted.flow, persisted.token))
  }

  async logout({ request, response }: HttpContext) {
    const parsed = flowSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    const cookies = flow.auth?.cookies ?? flow.pendingCookies
    if (cookies && flow.pendingUrl) {
      await signOut(flow.pendingUrl, cookies)
    }
    const persisted = await this.persist({ ...flow, auth: undefined, pendingCookies: undefined })
    return response.json(presentFlow(persisted.flow, persisted.token))
  }

  async avatar({ request, response }: HttpContext) {
    const parsed = flowSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    if (!flow.auth) {
      return response
        .status(409)
        .json({ error: 'not_authenticated', error_description: 'Sign in to the panel first.' })
    }
    const instanceUrl = this.resolveInstanceUrl(flow)
    let image: string | null = null
    if (flow.auth.method === 'credentials' && flow.auth.cookies) {
      image = await fetchAvatarWithSession(instanceUrl, flow.auth.cookies)
    } else if (flow.auth.method === 'api_key' && flow.auth.apiKey) {
      image = await fetchAvatarWithApiKey(instanceUrl, flow.auth.apiKey)
    }
    return response.json({ image })
  }

  async consent({ request, response }: HttpContext) {
    const parsed = consentSchema.safeParse(request.body())
    if (!parsed.success) {
      return response.status(400).json({ error: 'invalid_request' })
    }
    const flow = await this.load(parsed.data.flow)
    const auth = flow.auth
    if (!auth) {
      return response
        .status(409)
        .json({ error: 'not_authenticated', error_description: 'Sign in to the panel first.' })
    }

    const submitted = parsed.data.scopes
    const requested =
      submitted === undefined ? flow.scopes : (submitted.filter(isScope) as Scope[])
    const granted = [...new Set(requested)].filter((scope) => flow.scopes.includes(scope)) as Scope[]
    if (granted.length === 0) {
      return response.status(400).json({
        error: 'invalid_scope',
        error_description: 'Select at least one permission to authorize.',
      })
    }

    const available = auth.account.organizations ?? []
    let selected = available
    if (parsed.data.organizations !== undefined && available.length > 0) {
      const wanted = new Set(parsed.data.organizations)
      selected = available.filter((organization) => wanted.has(organization.id))
      if (selected.length === 0) {
        return response.status(400).json({
          error: 'invalid_request',
          error_description: 'Select at least one organization to authorize.',
        })
      }
    }

    const instanceUrl = this.resolveInstanceUrl(flow)
    const organizations: ConnectionOrganization[] = []
    if (auth.method === 'api_key') {
      if (!auth.apiKey) {
        return response
          .status(409)
          .json({ error: 'not_authenticated', error_description: 'Sign in to the panel first.' })
      }
      const targets = selected.length
        ? selected
        : [{ id: auth.account.organizationId ?? 'default', name: auth.account.organizationName }]
      for (const target of targets) {
        organizations.push({ id: target.id, name: target.name, apiKey: auth.apiKey })
      }
    } else {
      if (!auth.cookies) {
        return response
          .status(409)
          .json({ error: 'session_expired', error_description: 'Sign in to the panel again.' })
      }
      const targets = selected.length
        ? selected
        : [{ id: auth.account.organizationId, name: auth.account.organizationName }]
      for (const target of targets) {
        const apiKey = await createApiKeyWithSession(
          instanceUrl,
          auth.cookies,
          targets.length > 1 && target.name ? `${config.apiKeyLabel} ${target.name}` : config.apiKeyLabel,
          target.id
        )
        organizations.push({ id: target.id ?? 'default', name: target.name, apiKey })
      }
    }

    const primary =
      organizations.find((organization) => organization.id === auth.account.organizationId) ??
      organizations[0]
    const connection: DokployConnection = {
      url: instanceUrl,
      host: new URL(instanceUrl).hostname,
      apiKey: primary.apiKey,
      account: {
        ...auth.account,
        organizationId: primary.id,
        organizationName: primary.name,
        organizations: organizations.map(({ id, name }) => ({ id, name })),
      },
      method: auth.method,
      organizations,
    }

    const code = await sealCode({
      clientId: flow.clientId,
      redirectUri: flow.redirectUri,
      codeChallenge: flow.codeChallenge,
      codeChallengeMethod: flow.codeChallengeMethod,
      scopes: granted,
      connection,
    })

    const target = new URL(flow.redirectUri)
    target.searchParams.set('code', code)
    if (flow.state) {
      target.searchParams.set('state', flow.state)
    }
    return response.json({
      redirect_to: target.toString(),
      granted_scopes: granted,
      granted_organizations: organizations.map(({ id, name }) => ({ id, name })),
    })
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
