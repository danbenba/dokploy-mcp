import { test } from '@japa/runner'
import { isPrivateAddress, verifyDokployInstance } from '#services/dokploy/verifier'
import { InstanceVerificationError } from '#services/dokploy/errors'
import { normalizeBaseUrl } from '#config/dokploy_mcp'

test.group('private address detection', () => {
  test('flags loopback, link local and rfc1918 ranges', ({ assert }) => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.1',
      '169.254.169.254',
      '0.0.0.0',
      '100.64.0.1',
    ]) {
      assert.isTrue(isPrivateAddress(address), `${address} should be private`)
    }
  })

  test('allows public addresses', ({ assert }) => {
    for (const address of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.169.0.1', '51.15.20.30']) {
      assert.isFalse(isPrivateAddress(address), `${address} should be public`)
    }
  })

  test('flags private ipv6 ranges including mapped ipv4', ({ assert }) => {
    assert.isTrue(isPrivateAddress('::1'))
    assert.isTrue(isPrivateAddress('fe80::1'))
    assert.isTrue(isPrivateAddress('fd00::1'))
    assert.isTrue(isPrivateAddress('::ffff:127.0.0.1'))
    assert.isFalse(isPrivateAddress('2001:4860:4860::8888'))
  })
})

test.group('base url normalization', () => {
  test('adds https and trims trailing slashes', ({ assert }) => {
    assert.equal(normalizeBaseUrl('panel.example.com'), 'https://panel.example.com')
    assert.equal(normalizeBaseUrl('https://panel.example.com/'), 'https://panel.example.com')
  })

  test('strips a trailing api segment so users can paste either form', ({ assert }) => {
    assert.equal(normalizeBaseUrl('https://panel.example.com/api'), 'https://panel.example.com')
  })

  test('drops credentials, query and fragment', ({ assert }) => {
    assert.equal(
      normalizeBaseUrl('https://user:pass@panel.example.com/?a=1#b'),
      'https://panel.example.com'
    )
  })
})

test.group('instance verification', () => {
  test('refuses plain http panels by default', async ({ assert }) => {
    await assert.rejects(
      () => verifyDokployInstance('http://panel.example.com'),
      InstanceVerificationError
    )
  })

  test('refuses panels resolving to private addresses', async ({ assert }) => {
    await assert.rejects(
      () => verifyDokployInstance('https://192.168.1.10'),
      InstanceVerificationError
    )
    await assert.rejects(() => verifyDokployInstance('https://localhost'), InstanceVerificationError)
  })

  test('refuses obviously invalid input', async ({ assert }) => {
    await assert.rejects(() => verifyDokployInstance('not a url at all'), InstanceVerificationError)
  })

  test('passes the address guard when the deployment opts in', async ({ assert }) => {
    let captured: unknown
    try {
      await verifyDokployInstance('http://127.0.0.1:9', {
        allowPrivateNetworks: true,
        allowInsecure: true,
        timeoutMs: 500,
      })
    } catch (error) {
      captured = error
    }
    assert.instanceOf(captured, InstanceVerificationError)
    assert.equal((captured as InstanceVerificationError).code, 'unreachable')
  })
})
