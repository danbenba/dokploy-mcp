import { test } from '@japa/runner'
import {
  ALL_SCOPES,
  DEFAULT_SCOPES,
  describeScopes,
  formatScopeParam,
  hasScope,
  parseScopeParam,
  sanitizeScopes,
} from '#oauth/scopes'

test.group('oauth scopes', () => {
  test('falls back to the default scopes when none are requested', ({ assert }) => {
    assert.deepEqual(sanitizeScopes(undefined), DEFAULT_SCOPES)
    assert.deepEqual(sanitizeScopes([]), DEFAULT_SCOPES)
    assert.deepEqual(parseScopeParam(null), DEFAULT_SCOPES)
  })

  test('drops unknown scopes and removes duplicates', ({ assert }) => {
    assert.deepEqual(sanitizeScopes(['read', 'read', 'wizard']), ['read'])
  })

  test('falls back to defaults when every requested scope is unknown', ({ assert }) => {
    assert.deepEqual(sanitizeScopes(['wizard', 'root']), DEFAULT_SCOPES)
  })

  test('parses space and plus separated scope parameters', ({ assert }) => {
    assert.deepEqual(parseScopeParam('read deploy'), ['read', 'deploy'])
    assert.deepEqual(parseScopeParam('read+delete'), ['read', 'delete'])
  })

  test('formats scopes back into a space separated parameter', ({ assert }) => {
    assert.equal(formatScopeParam(['read', 'deploy']), 'read deploy')
  })

  test('admin implies every other scope', ({ assert }) => {
    for (const scope of ALL_SCOPES) {
      assert.isTrue(hasScope(['admin'], scope))
    }
  })

  test('read is implied by any granted scope', ({ assert }) => {
    assert.isTrue(hasScope(['deploy'], 'read'))
    assert.isFalse(hasScope([], 'read'))
  })

  test('does not widen a narrow grant', ({ assert }) => {
    assert.isFalse(hasScope(['read'], 'deploy'))
    assert.isFalse(hasScope(['deploy', 'create'], 'delete'))
    assert.isFalse(hasScope(['deploy'], 'admin'))
  })

  test('marks destructive scopes as risky in the consent catalogue', ({ assert }) => {
    const risky = describeScopes(ALL_SCOPES)
      .filter((definition) => definition.risky)
      .map((definition) => definition.id)
    assert.deepEqual(risky, ['delete', 'admin'])
  })

  test('describes only the scopes that were requested', ({ assert }) => {
    const described = describeScopes(['read', 'delete'])
    assert.deepEqual(
      described.map((definition) => definition.id),
      ['read', 'delete']
    )
    assert.isTrue(described.every((definition) => definition.description.length > 20))
  })
})
