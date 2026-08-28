import { createHash } from 'node:crypto'
import { test } from '@japa/runner'
import config from '#config/dokploy_mcp'
import { resetRateLimits } from '#middleware/rate_limit_middleware'

const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback'
const VERIFIER = 'pkce-verifier-used-by-the-functional-suite-0123456789'
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url')

async function registerClient(client: any, redirectUris = [REDIRECT_URI]) {
  const response = await client.post('/oauth/register').json({
    client_name: 'Claude',
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
  })
  return response.body().client_id as string
}

function authorizeUrl(clientId: string, overrides: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: 'state-123',
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    scope: 'read deploy create',
  })
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }
  return `/oauth/authorize?${params.toString()}`
}

test.group('dynamic client registration', (group) => {
  group.each.setup(() => resetRateLimits())

  test('registers a public client and echoes its metadata', async ({ client, assert }) => {
    const response = await client.post('/oauth/register').json({
      client_name: 'Claude',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
    })
    response.assertStatus(201)
    assert.isString(response.body().client_id)
    assert.equal(response.body().client_name, 'Claude')
    assert.deepEqual(response.body().redirect_uris, [REDIRECT_URI])
    assert.equal(response.body().token_endpoint_auth_method, 'none')
  })

  test('rejects a registration without a redirect uri', async ({ client }) => {
    const response = await client.post('/oauth/register').json({ client_name: 'Claude' })
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_redirect_uri' })
  })

  test('rejects a confidential client', async ({ client }) => {
    const response = await client.post('/oauth/register').json({
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'client_secret_post',
    })
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_client_metadata' })
  })
})

test.group('authorization endpoint', (group) => {
  group.each.setup(() => resetRateLimits())

  test('redirects a valid request to the login experience', async ({ client, assert }) => {
    const clientId = await registerClient(client)
    const response = await client.get(authorizeUrl(clientId)).redirects(0)
    response.assertStatus(302)

    const location = new URL(response.header('location') as string)
    assert.equal(location.origin + location.pathname, `${config.webUrl}/login`)
    assert.isString(location.searchParams.get('flow'))
  })

  test('refuses an unknown client', async ({ client }) => {
    const response = await client.get(authorizeUrl('forged-client-id')).redirects(0)
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_client' })
  })

  test('refuses a redirect uri the client never registered', async ({ client }) => {
    const clientId = await registerClient(client)
    const response = await client
      .get(authorizeUrl(clientId, { redirect_uri: 'https://evil.example.com/cb' }))
      .redirects(0)
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_client' })
  })

  test('requires pkce and reports it on the client redirect uri', async ({ client, assert }) => {
    const clientId = await registerClient(client)
    const response = await client
      .get(authorizeUrl(clientId, { code_challenge: undefined }))
      .redirects(0)
    response.assertStatus(302)

    const location = new URL(response.header('location') as string)
    assert.equal(location.origin + location.pathname, REDIRECT_URI)
    assert.equal(location.searchParams.get('error'), 'invalid_request')
    assert.equal(location.searchParams.get('state'), 'state-123')
  })

  test('refuses an implicit style response type', async ({ client, assert }) => {
    const clientId = await registerClient(client)
    const response = await client.get(authorizeUrl(clientId, { response_type: 'token' })).redirects(0)
    response.assertStatus(302)
    assert.equal(
      new URL(response.header('location') as string).searchParams.get('error'),
      'unsupported_response_type'
    )
  })

  test('refuses a downgraded pkce method', async ({ client, assert }) => {
    const clientId = await registerClient(client)
    const response = await client
      .get(authorizeUrl(clientId, { code_challenge_method: 'plain' }))
      .redirects(0)
    response.assertStatus(302)
    assert.equal(
      new URL(response.header('location') as string).searchParams.get('error'),
      'invalid_request'
    )
  })
})

test.group('token endpoint', (group) => {
  group.each.setup(() => resetRateLimits())

  test('refuses an unsupported grant type', async ({ client }) => {
    const response = await client.post('/oauth/token').form({ grant_type: 'password' })
    response.assertStatus(400)
    response.assertBodyContains({ error: 'unsupported_grant_type' })
  })

  test('refuses an authorization code request without a code', async ({ client }) => {
    const response = await client.post('/oauth/token').form({ grant_type: 'authorization_code' })
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_request' })
  })

  test('refuses a forged authorization code', async ({ client }) => {
    const response = await client
      .post('/oauth/token')
      .form({ grant_type: 'authorization_code', code: 'forged', code_verifier: VERIFIER })
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_grant' })
  })

  test('refuses a forged refresh token', async ({ client }) => {
    const response = await client
      .post('/oauth/token')
      .form({ grant_type: 'refresh_token', refresh_token: 'forged' })
    response.assertStatus(400)
    response.assertBodyContains({ error: 'invalid_grant' })
  })
})

test.group('login flow api', (group) => {
  group.each.setup(() => resetRateLimits())

  async function startFlow(client: any) {
    const clientId = await registerClient(client)
    const response = await client.get(authorizeUrl(clientId)).redirects(0)
    return new URL(response.header('location') as string).searchParams.get('flow') as string
  }

  test('exposes the pending authorization request to the web ui', async ({ client, assert }) => {
    const flow = await startFlow(client)
    const response = await client.post('/flow/session').json({ flow })
    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.stage, 'instance')
    assert.equal(body.client.name, 'Claude')
    assert.equal(body.brand, config.brandName)
    assert.deepEqual(body.requested_scopes, ['read', 'deploy', 'create'])
    assert.lengthOf(body.scope_catalog, 3)
    assert.isNull(body.account)
  })

  test('refuses a forged flow token', async ({ client }) => {
    const response = await client.post('/flow/session').json({ flow: 'forged-flow-token' })
    response.assertStatus(400)
  })

  test('refuses to consent before the panel is authenticated', async ({ client }) => {
    const flow = await startFlow(client)
    const response = await client.post('/flow/consent').json({ flow, scopes: ['read'] })
    response.assertStatus(409)
    response.assertBodyContains({ error: 'not_authenticated' })
  })

  test('refuses to sign in before a panel address is known', async ({ client }) => {
    const flow = await startFlow(client)
    const response = await client
      .post('/flow/login')
      .json({ flow, email: 'ada@example.com', password: 'password123' })
    response.assertStatus(401)
    response.assertBodyContains({ error: 'missing_instance' })
  })

  test('refuses a panel address on a private network', async ({ client }) => {
    const flow = await startFlow(client)
    const response = await client.post('/flow/verify').json({ flow, url: 'https://192.168.1.10' })
    response.assertStatus(422)
    response.assertBodyContains({ error: 'private_address' })
  })

  test('refuses a plain http panel address', async ({ client }) => {
    const flow = await startFlow(client)
    const response = await client.post('/flow/verify').json({ flow, url: 'http://panel.example.com' })
    response.assertStatus(422)
    response.assertBodyContains({ error: 'insecure' })
  })

  test('builds the denial redirect back to the client', async ({ client, assert }) => {
    const flow = await startFlow(client)
    const response = await client.post('/flow/deny').json({ flow })
    response.assertStatus(200)

    const target = new URL(response.body().redirect_to)
    assert.equal(target.origin + target.pathname, REDIRECT_URI)
    assert.equal(target.searchParams.get('error'), 'access_denied')
    assert.equal(target.searchParams.get('state'), 'state-123')
  })
})
