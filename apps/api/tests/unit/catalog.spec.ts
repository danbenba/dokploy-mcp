import { test } from '@japa/runner'
import { catalogCount, describeEndpoint, findEndpoints, resolveService, summarizeProject } from '@dokploy-mcp/core'

test.group('dokploy api catalog', () => {
  test('embeds the whole dokploy surface', ({ assert }) => {
    assert.isAbove(catalogCount(), 500)
  })

  test('ranks the exact router procedure first', ({ assert }) => {
    assert.equal(findEndpoints('application deploy')[0].path, '/application.deploy')
    assert.equal(findEndpoints('domain create')[0].path, '/domain.create')
  })

  test('exposes required flags and enums from the openapi spec', ({ assert }) => {
    const entry = describeEndpoint('/application.create')
    assert.equal(entry?.method, 'POST')
    assert.isTrue(entry?.params?.environmentId.required)

    const build = describeEndpoint('/application.saveBuildType')
    assert.include(build?.params?.buildType.enum as string[], 'nixpacks')
  })

  test('normalizes a path given without a leading slash', ({ assert }) => {
    assert.equal(describeEndpoint('project.all')?.path, '/project.all')
  })

  test('returns null for an unknown endpoint', ({ assert }) => {
    assert.isNull(describeEndpoint('/does.notExist'))
  })

  test('returns nothing rather than noise for an unmatched query', ({ assert }) => {
    assert.isEmpty(findEndpoints('kubernetes helm chart'))
  })

  test('honours the result limit', ({ assert }) => {
    assert.lengthOf(findEndpoints('application', 3), 3)
  })
})

test.group('service routing', () => {
  test('maps every service type to its router and id parameter', ({ assert }) => {
    assert.deepEqual(resolveService('application'), {
      router: 'application',
      idParam: 'applicationId',
    })
    assert.deepEqual(resolveService('postgres'), { router: 'postgres', idParam: 'postgresId' })
    assert.deepEqual(resolveService('libsql'), { router: 'libsql', idParam: 'libsqlId' })
  })

  test('accepts the aliases operators naturally use', ({ assert }) => {
    assert.equal(resolveService('app').router, 'application')
    assert.equal(resolveService('PG').router, 'postgres')
    assert.equal(resolveService('stack').router, 'compose')
    assert.equal(resolveService('mongodb').router, 'mongo')
  })

  test('rejects an unknown service type with a helpful message', ({ assert }) => {
    assert.throws(() => resolveService('kubernetes'), /Unknown service_type/)
  })
})

test.group('payload summarizers', () => {
  test('flattens a project into its services', ({ assert }) => {
    const summary = summarizeProject({
      projectId: 'p1',
      name: 'acme',
      environments: [
        {
          environmentId: 'e1',
          name: 'production',
          applications: [
            { applicationId: 'a1', name: 'web', applicationStatus: 'done', appName: 'acme-web' },
          ],
          postgres: [{ postgresId: 'd1', name: 'db', postgresStatus: 'done' }],
        },
      ],
    })
    const environment = summary.environments as Array<Record<string, unknown>>
    const services = environment[0].services as Array<Record<string, unknown>>
    assert.lengthOf(services, 2)
    assert.deepEqual(
      services.map((service) => service.type),
      ['application', 'postgres']
    )
    assert.equal(services[0].appName, 'acme-web')
  })

  test('survives a project without environments', ({ assert }) => {
    const summary = summarizeProject({ projectId: 'p2', name: 'empty' })
    assert.deepEqual(summary.environments, [])
  })
})
