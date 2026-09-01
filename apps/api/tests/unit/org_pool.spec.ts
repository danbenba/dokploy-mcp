import { test } from '@japa/runner'
import { DokployApiError, DokployOrgPool } from '@dokploy-mcp/core'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function poolOf(handlers: Record<string, (path: string) => Response>) {
  const calls: string[] = []
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    const apiKey = headers.get('x-api-key') ?? ''
    calls.push(apiKey)
    const path = new URL(String(input)).pathname
    return handlers[apiKey](path)
  }) as typeof fetch
  const pool = new DokployOrgPool('https://panel.example.com', [
    { id: 'org-a', name: 'Acme', apiKey: 'key-a' },
    { id: 'org-b', name: 'Umbrella', apiKey: 'key-b' },
  ])
  return { pool, calls }
}

test.group('dokploy organization pool', (group) => {
  const originalFetch = globalThis.fetch
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('routes a call to the first organization by default', async ({ assert }) => {
    const { pool, calls } = poolOf({
      'key-a': () => jsonResponse(200, { projectId: 'p1' }),
      'key-b': () => jsonResponse(200, { projectId: 'p2' }),
    })
    const result = (await pool.get('/project.one')) as Record<string, unknown>
    assert.equal(result.projectId, 'p1')
    assert.deepEqual(calls, ['key-a'])
  })

  test('falls back to the next organization when a resource is not found', async ({ assert }) => {
    const { pool, calls } = poolOf({
      'key-a': () => jsonResponse(404, { message: 'Project not found' }),
      'key-b': () => jsonResponse(200, { projectId: 'p2' }),
    })
    const result = (await pool.get('/project.one')) as Record<string, unknown>
    assert.equal(result.projectId, 'p2')
    assert.deepEqual(calls, ['key-a', 'key-b'])
  })

  test('falls back when an organization rejects the api key', async ({ assert }) => {
    const { pool } = poolOf({
      'key-a': () => jsonResponse(403, { message: 'Forbidden' }),
      'key-b': () => jsonResponse(200, { ok: true }),
    })
    const result = (await pool.post('/application.deploy', { applicationId: 'x' })) as Record<
      string,
      unknown
    >
    assert.equal(result.ok, true)
  })

  test('reports the first error when every organization refuses', async ({ assert }) => {
    const { pool, calls } = poolOf({
      'key-a': () => jsonResponse(404, { message: 'Project not found' }),
      'key-b': () => jsonResponse(404, { message: 'Project not found' }),
    })
    await assert.rejects(() => pool.get('/project.one'), DokployApiError)
    assert.deepEqual(calls, ['key-a', 'key-b'])
  })

  test('does not retry server errors on another organization', async ({ assert }) => {
    const { pool, calls } = poolOf({
      'key-a': () => jsonResponse(500, { message: 'boom' }),
      'key-b': () => jsonResponse(200, { ok: true }),
    })
    await assert.rejects(() => pool.get('/project.all'), DokployApiError)
    assert.deepEqual(calls, ['key-a'])
  })

  test('exposes one client per organization', async ({ assert }) => {
    const { pool, calls } = poolOf({
      'key-a': () => jsonResponse(200, []),
      'key-b': () => jsonResponse(200, []),
    })
    assert.lengthOf(pool.organizations, 2)
    const client = pool.clientFor('org-b')
    assert.isNotNull(client)
    await client!.get('/project.all')
    assert.deepEqual(calls, ['key-b'])
    assert.isNull(pool.clientFor('missing'))
  })
})
