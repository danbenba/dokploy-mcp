import { test } from '@japa/runner'
import { sealAccess, type DokployConnection } from '#oauth/tokens'
import type { Scope } from '@dokploy-mcp/core'

const connection: DokployConnection = {
  url: 'https://panel.example.com',
  host: 'panel.example.com',
  apiKey: 'test-api-key',
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

function tokenFor(scopes: Scope[]) {
  return sealAccess({ clientId: 'client-1', scopes, connection })
}

async function listTools(client: any, scopes: Scope[]): Promise<string[]> {
  const token = await tokenFor(scopes)
  const response = await client
    .post('/mcp')
    .header('authorization', `Bearer ${token}`)
    .header('accept', 'application/json, text/event-stream')
    .json({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
  return (response.body().result?.tools ?? []).map((tool: { name: string }) => tool.name)
}

test.group('mcp endpoint authentication', () => {
  test('challenges an unauthenticated call with the resource metadata url', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/mcp')
      .json({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    response.assertStatus(401)

    const challenge = response.header('www-authenticate') as string
    assert.include(challenge, 'Bearer')
    assert.include(challenge, 'resource_metadata=')
    assert.include(challenge, '/.well-known/oauth-protected-resource')
  })

  test('rejects a forged bearer token', async ({ client, assert }) => {
    const response = await client
      .post('/mcp')
      .header('authorization', 'Bearer forged-token')
      .json({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    response.assertStatus(401)
    assert.equal(response.body().error, 'invalid_token')
  })

  test('rejects a malformed authorization header', async ({ client }) => {
    const response = await client
      .post('/mcp')
      .header('authorization', 'Basic dXNlcjpwYXNz')
      .json({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    response.assertStatus(401)
  })

  test('answers get and delete with method not allowed', async ({ client }) => {
    const token = await tokenFor(['read'])
    const get = await client.get('/mcp').header('authorization', `Bearer ${token}`)
    get.assertStatus(405)
    const remove = await client.delete('/mcp').header('authorization', `Bearer ${token}`)
    remove.assertStatus(405)
  })
})

test.group('mcp tool exposure follows granted scopes', () => {
  test('a read only connection cannot see mutating tools', async ({ client, assert }) => {
    const tools = await listTools(client, ['read'])
    assert.includeMembers(tools, [
      'dokploy_status',
      'list_projects',
      'get_application',
      'service_logs',
      'deployment_logs',
      'api_find',
    ])
    assert.notInclude(tools, 'create_project')
    assert.notInclude(tools, 'service_action')
    assert.notInclude(tools, 'delete_project')
    assert.notInclude(tools, 'add_domain')
  })

  test('a deploy connection gains lifecycle tools but not creation', async ({ client, assert }) => {
    const tools = await listTools(client, ['read', 'deploy'])
    assert.includeMembers(tools, [
      'service_action',
      'set_service_env',
      'configure_app_source',
      'configure_app_build',
      'cancel_deployment',
      'update_domain',
    ])
    assert.notInclude(tools, 'create_project')
    assert.notInclude(tools, 'delete_project')
  })

  test('a create connection gains resource creation tools', async ({ client, assert }) => {
    const tools = await listTools(client, ['read', 'create'])
    assert.includeMembers(tools, [
      'create_project',
      'create_environment',
      'create_application',
      'create_compose',
      'create_database',
      'add_domain',
      'deploy_template',
    ])
    assert.notInclude(tools, 'delete_project')
    assert.notInclude(tools, 'service_action')
  })

  test('only a delete connection exposes destructive tools', async ({ client, assert }) => {
    const tools = await listTools(client, ['read', 'delete'])
    assert.includeMembers(tools, ['delete_project', 'delete_service', 'delete_domain'])
  })

  test('an admin connection sees the whole tool surface', async ({ client, assert }) => {
    const tools = await listTools(client, ['admin'])
    assert.includeMembers(tools, [
      'dokploy_status',
      'list_projects',
      'create_project',
      'delete_project',
      'service_action',
      'add_domain',
      'create_database',
      'deploy_template',
      'list_containers',
      'container_action',
      'dokploy_api',
      'playbook',
    ])
  })

  test('every exposed tool documents itself for the model', async ({ client, assert }) => {
    const token = await tokenFor(['admin'])
    const response = await client
      .post('/mcp')
      .header('authorization', `Bearer ${token}`)
      .header('accept', 'application/json, text/event-stream')
      .json({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })

    const tools = response.body().result.tools as Array<{ description?: string; title?: string }>
    assert.isAbove(tools.length, 25)
    assert.isTrue(tools.every((tool) => (tool.description ?? '').length > 40))
  })
})

test.group('mcp protocol handshake', () => {
  test('initializes and announces the tools capability', async ({ client, assert }) => {
    const token = await tokenFor(['read'])
    const response = await client
      .post('/mcp')
      .header('authorization', `Bearer ${token}`)
      .header('accept', 'application/json, text/event-stream')
      .json({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      })

    response.assertStatus(200)
    const result = response.body().result
    assert.equal(result.serverInfo.name, 'dokploy')
    assert.property(result.capabilities, 'tools')
    assert.include(result.instructions, 'organization contains projects')
  })

  test('runs a tool without reaching dokploy when the answer is local', async ({
    client,
    assert,
  }) => {
    const token = await tokenFor(['read'])
    const response = await client
      .post('/mcp')
      .header('authorization', `Bearer ${token}`)
      .header('accept', 'application/json, text/event-stream')
      .json({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'playbook', arguments: { name: 'deploy' } },
      })

    response.assertStatus(200)
    const text = response.body().result.content[0].text as string
    assert.include(text, 'Playbook: deploy')
    assert.include(text, 'create_application')
  })

  test('reports the connected account through the status tool', async ({ client, assert }) => {
    const token = await tokenFor(['read'])
    const response = await client
      .post('/mcp')
      .header('authorization', `Bearer ${token}`)
      .header('accept', 'application/json, text/event-stream')
      .json({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'dokploy_status', arguments: {} },
      })

    response.assertStatus(200)
    const payload = JSON.parse(response.body().result.content[0].text)
    assert.equal(payload.instance, 'https://panel.example.com')
    assert.equal(payload.account.email, 'ada@example.com')
    assert.deepEqual(payload.granted_scopes, ['read'])
  })
})
