import { test } from '@japa/runner'
import config from '#config/dokploy_mcp'

test.group('discovery metadata', () => {
  test('advertises the authorization server per rfc 8414', async ({ client, assert }) => {
    const response = await client.get('/.well-known/oauth-authorization-server')
    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.issuer, config.publicUrl)
    assert.equal(body.authorization_endpoint, `${config.publicUrl}/oauth/authorize`)
    assert.equal(body.token_endpoint, `${config.publicUrl}/oauth/token`)
    assert.equal(body.registration_endpoint, `${config.publicUrl}/oauth/register`)
    assert.deepEqual(body.code_challenge_methods_supported, ['S256'])
    assert.deepEqual(body.grant_types_supported, ['authorization_code', 'refresh_token'])
    assert.deepEqual(body.token_endpoint_auth_methods_supported, ['none'])
  })

  test('advertises the protected resource per rfc 9728', async ({ client, assert }) => {
    const response = await client.get('/.well-known/oauth-protected-resource')
    response.assertStatus(200)
    assert.equal(response.body().resource, config.resourceUrl)
    assert.deepEqual(response.body().authorization_servers, [config.publicUrl])
  })

  test('answers the mcp suffixed discovery paths clients probe', async ({ client }) => {
    await client.get('/.well-known/oauth-protected-resource/mcp').then((r) => r.assertStatus(200))
    await client.get('/.well-known/oauth-authorization-server/mcp').then((r) => r.assertStatus(200))
    await client.get('/.well-known/openid-configuration').then((r) => r.assertStatus(200))
  })

  test('reports health and the embedded catalog size', async ({ client, assert }) => {
    const response = await client.get('/health')
    response.assertStatus(200)
    assert.equal(response.body().status, 'ok')
    assert.isAbove(response.body().dokploy_catalog.endpoints, 500)
  })

  test('describes itself on the root endpoint', async ({ client, assert }) => {
    const response = await client.get('/')
    response.assertStatus(200)
    assert.equal(response.body().mcp_endpoint, config.resourceUrl)
  })
})
