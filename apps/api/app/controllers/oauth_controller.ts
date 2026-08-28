import type { HttpContext } from '@adonisjs/core/http'
import config from '#config/dokploy_mcp'
import {
  assertRedirectUriAllowed,
  issueClientId,
  normalizeRegistration,
  RegistrationError,
  resolveClient,
} from '#oauth/clients'
import { formatScopeParam, parseScopeParam } from '#oauth/scopes'
import {
  createFlowPayload,
  openCode,
  openRefresh,
  sealAccess,
  sealFlow,
  sealRefresh,
  TokenError,
  verifyPkce,
} from '#oauth/tokens'

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }
  return null
}

export default class OauthController {
  async register({ request, response }: HttpContext) {
    try {
      const normalized = normalizeRegistration(request.body())
      const clientId = await issueClientId(normalized)
      return response.status(201).json({
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: normalized.clientName,
        redirect_uris: normalized.redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: normalized.tokenEndpointAuthMethod,
      })
    } catch (error) {
      if (error instanceof RegistrationError) {
        return response.status(400).json({ error: error.code, error_description: error.message })
      }
      throw error
    }
  }

  async authorize({ request, response }: HttpContext) {
    const query = request.qs()
    const clientId = firstString(query.client_id)
    const redirectUri = firstString(query.redirect_uri)
    const responseType = firstString(query.response_type)
    const state = firstString(query.state)
    const codeChallenge = firstString(query.code_challenge)
    const codeChallengeMethod = firstString(query.code_challenge_method)
    const resource = firstString(query.resource)

    if (!clientId) {
      return response
        .status(400)
        .json({ error: 'invalid_request', error_description: 'client_id is required.' })
    }
    if (!redirectUri) {
      return response
        .status(400)
        .json({ error: 'invalid_request', error_description: 'redirect_uri is required.' })
    }

    let client
    try {
      client = await resolveClient(clientId)
      assertRedirectUriAllowed(client, redirectUri)
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown client.'
      return response.status(400).json({ error: 'invalid_client', error_description: description })
    }

    const redirectWithError = (code: string, description: string) => {
      const target = new URL(redirectUri)
      target.searchParams.set('error', code)
      target.searchParams.set('error_description', description)
      if (state) {
        target.searchParams.set('state', state)
      }
      return response.redirect(target.toString())
    }

    if (responseType !== 'code') {
      return redirectWithError('unsupported_response_type', 'Only response_type=code is supported.')
    }
    if (!codeChallenge) {
      return redirectWithError('invalid_request', 'PKCE is required: send a code_challenge.')
    }
    if (codeChallengeMethod && codeChallengeMethod.toUpperCase() !== 'S256') {
      return redirectWithError(
        'invalid_request',
        'Only the S256 code_challenge_method is supported.'
      )
    }

    const flow = createFlowPayload({
      clientId,
      clientName: client.clientName,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
      scopes: parseScopeParam(firstString(query.scope)),
      resource,
    })
    const flowToken = await sealFlow(flow)

    const target = new URL('/login', config.webUrl)
    target.searchParams.set('flow', flowToken)
    return response.redirect(target.toString())
  }

  async token({ request, response }: HttpContext) {
    const body = request.body() as Record<string, unknown>
    const grantType = firstString(body.grant_type)

    const fail = (status: number, code: string, description: string) =>
      response.status(status).json({ error: code, error_description: description })

    try {
      if (grantType === 'authorization_code') {
        const code = firstString(body.code)
        const clientId = firstString(body.client_id)
        const redirectUri = firstString(body.redirect_uri)
        const codeVerifier = firstString(body.code_verifier) ?? undefined

        if (!code) {
          return fail(400, 'invalid_request', 'code is required.')
        }
        const payload = await openCode(code)
        if (clientId && clientId !== payload.clientId) {
          return fail(400, 'invalid_grant', 'This authorization code belongs to another client.')
        }
        if (redirectUri && redirectUri !== payload.redirectUri) {
          return fail(400, 'invalid_grant', 'The redirect_uri does not match the authorization request.')
        }
        verifyPkce(payload.codeChallenge, payload.codeChallengeMethod, codeVerifier)

        const accessToken = await sealAccess({
          clientId: payload.clientId,
          scopes: payload.scopes,
          connection: payload.connection,
        })
        const refreshToken = await sealRefresh({
          clientId: payload.clientId,
          scopes: payload.scopes,
          connection: payload.connection,
        })
        return response.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: config.accessTokenTtl,
          refresh_token: refreshToken,
          scope: formatScopeParam(payload.scopes),
        })
      }

      if (grantType === 'refresh_token') {
        const token = firstString(body.refresh_token)
        if (!token) {
          return fail(400, 'invalid_request', 'refresh_token is required.')
        }
        const payload = await openRefresh(token)
        const clientId = firstString(body.client_id)
        if (clientId && clientId !== payload.clientId) {
          return fail(400, 'invalid_grant', 'This refresh token belongs to another client.')
        }
        const accessToken = await sealAccess({
          clientId: payload.clientId,
          scopes: payload.scopes,
          connection: payload.connection,
        })
        const refreshToken = await sealRefresh({
          clientId: payload.clientId,
          scopes: payload.scopes,
          connection: payload.connection,
        })
        return response.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: config.accessTokenTtl,
          refresh_token: refreshToken,
          scope: formatScopeParam(payload.scopes),
        })
      }

      return fail(
        400,
        'unsupported_grant_type',
        'Only authorization_code and refresh_token grants are supported.'
      )
    } catch (error) {
      if (error instanceof TokenError) {
        const code = error.code === 'expired' ? 'invalid_grant' : error.code
        return fail(400, code === 'invalid' ? 'invalid_grant' : code, error.message)
      }
      throw error
    }
  }

  async revoke({ response }: HttpContext) {
    return response.status(200).json({})
  }
}
