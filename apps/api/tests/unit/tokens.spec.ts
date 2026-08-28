import { createHash } from 'node:crypto'
import { test } from '@japa/runner'
import {
  createFlowPayload,
  openAccess,
  openCode,
  openFlow,
  sealAccess,
  sealCode,
  sealFlow,
  TokenError,
  verifyPkce,
} from '#oauth/tokens'
import type { DokployConnection } from '#oauth/tokens'

const connection: DokployConnection = {
  url: 'https://panel.example.com',
  host: 'panel.example.com',
  apiKey: 'secret-api-key',
  account: {
    name: 'Ada',
    email: 'ada@example.com',
    image: null,
    role: 'owner',
    organizationId: 'org-1',
    organizationName: 'Acme',
  },
  method: 'credentials',
}

const authorizationRequest = {
  clientId: 'client-1',
  clientName: 'Claude',
  redirectUri: 'https://claude.ai/api/mcp/auth_callback',
  state: 'state-1',
  codeChallenge: 'challenge',
  codeChallengeMethod: 'S256',
  scopes: ['read' as const, 'deploy' as const],
  resource: null,
}

test.group('oauth tokens', () => {
  test('round trips a flow token', async ({ assert }) => {
    const token = await sealFlow(createFlowPayload(authorizationRequest))
    const payload = await openFlow(token)
    assert.equal(payload.clientId, 'client-1')
    assert.equal(payload.redirectUri, authorizationRequest.redirectUri)
    assert.deepEqual(payload.scopes, ['read', 'deploy'])
  })

  test('round trips an access token carrying the dokploy connection', async ({ assert }) => {
    const token = await sealAccess({ clientId: 'client-1', scopes: ['read'], connection })
    const payload = await openAccess(token)
    assert.equal(payload.connection.apiKey, 'secret-api-key')
    assert.equal(payload.connection.account.email, 'ada@example.com')
  })

  test('never exposes the api key in the token envelope', async ({ assert }) => {
    const token = await sealAccess({ clientId: 'client-1', scopes: ['read'], connection })
    assert.notInclude(token, 'secret-api-key')
    assert.notInclude(token, 'panel.example.com')
  })

  test('rejects a token used as the wrong type', async ({ assert }) => {
    const token = await sealAccess({ clientId: 'client-1', scopes: ['read'], connection })
    await assert.rejects(() => openCode(token), TokenError)
  })

  test('rejects a tampered token', async ({ assert }) => {
    const token = await sealAccess({ clientId: 'client-1', scopes: ['read'], connection })
    const tampered = `${token.slice(0, -4)}abcd`
    await assert.rejects(() => openAccess(tampered), TokenError)
  })

  test('seals an authorization code with its pkce challenge', async ({ assert }) => {
    const code = await sealCode({
      clientId: 'client-1',
      redirectUri: authorizationRequest.redirectUri,
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
      scopes: ['read'],
      connection,
    })
    const payload = await openCode(code)
    assert.equal(payload.codeChallenge, 'challenge')
    assert.equal(payload.connection.url, 'https://panel.example.com')
  })
})

test.group('pkce verification', () => {
  const verifier = 'verifier-value-that-is-long-enough-for-pkce-checks'
  const challenge = createHash('sha256').update(verifier).digest('base64url')

  test('accepts a matching s256 verifier', ({ assert }) => {
    assert.doesNotThrow(() => verifyPkce(challenge, 'S256', verifier))
  })

  test('rejects a mismatched verifier', ({ assert }) => {
    assert.throws(() => verifyPkce(challenge, 'S256', 'wrong-verifier'), TokenError)
  })

  test('requires a verifier when a challenge was recorded', ({ assert }) => {
    assert.throws(() => verifyPkce(challenge, 'S256', undefined), TokenError)
  })

  test('rejects unsupported challenge methods', ({ assert }) => {
    assert.throws(() => verifyPkce(challenge, 'S512', verifier), TokenError)
  })

  test('accepts a plain challenge when it was issued that way', ({ assert }) => {
    assert.doesNotThrow(() => verifyPkce(verifier, 'plain', verifier))
  })
})
