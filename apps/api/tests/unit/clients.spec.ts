import { test } from '@japa/runner'
import {
  assertRedirectUriAllowed,
  issueClientId,
  normalizeRegistration,
  RegistrationError,
  resolveClient,
} from '#oauth/clients'
import { TokenError } from '#oauth/tokens'

test.group('client registration', () => {
  test('accepts a public client with https redirect uris', ({ assert }) => {
    const normalized = normalizeRegistration({
      client_name: 'Claude',
      redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      token_endpoint_auth_method: 'none',
    })
    assert.equal(normalized.clientName, 'Claude')
    assert.deepEqual(normalized.redirectUris, ['https://claude.ai/api/mcp/auth_callback'])
  })

  test('accepts loopback http redirect uris used by local clients', ({ assert }) => {
    const normalized = normalizeRegistration({
      redirect_uris: ['http://localhost:5599/callback', 'http://127.0.0.1:8080/cb'],
    })
    assert.lengthOf(normalized.redirectUris, 2)
  })

  test('names an unnamed client', ({ assert }) => {
    const normalized = normalizeRegistration({ redirect_uris: ['https://example.com/cb'] })
    assert.equal(normalized.clientName, 'MCP client')
  })

  test('rejects a registration without redirect uris', ({ assert }) => {
    assert.throws(() => normalizeRegistration({ redirect_uris: [] }), RegistrationError)
    assert.throws(() => normalizeRegistration({}), RegistrationError)
  })

  test('rejects plain http redirect uris outside loopback', ({ assert }) => {
    assert.throws(
      () => normalizeRegistration({ redirect_uris: ['http://evil.example.com/cb'] }),
      RegistrationError
    )
  })

  test('rejects redirect uris carrying a fragment', ({ assert }) => {
    assert.throws(
      () => normalizeRegistration({ redirect_uris: ['https://example.com/cb#fragment'] }),
      RegistrationError
    )
  })

  test('rejects confidential client authentication methods', ({ assert }) => {
    assert.throws(
      () =>
        normalizeRegistration({
          redirect_uris: ['https://example.com/cb'],
          token_endpoint_auth_method: 'client_secret_basic',
        }),
      RegistrationError
    )
  })

  test('round trips an issued client id', async ({ assert }) => {
    const clientId = await issueClientId({
      clientName: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
      tokenEndpointAuthMethod: 'none',
    })
    const client = await resolveClient(clientId)
    assert.equal(client.clientName, 'Claude')
    assert.deepEqual(client.redirectUris, ['https://claude.ai/api/mcp/auth_callback'])
  })

  test('rejects a forged client id', async ({ assert }) => {
    await assert.rejects(() => resolveClient('not-a-real-client-id'), TokenError)
  })

  test('rejects a redirect uri the client never registered', async ({ assert }) => {
    const clientId = await issueClientId({
      clientName: 'Claude',
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
      tokenEndpointAuthMethod: 'none',
    })
    const client = await resolveClient(clientId)
    assert.throws(() => assertRedirectUriAllowed(client, 'https://evil.example.com/cb'), TokenError)
    assert.doesNotThrow(() =>
      assertRedirectUriAllowed(client, 'https://claude.ai/api/mcp/auth_callback')
    )
  })
})
