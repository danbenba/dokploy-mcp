import { afterEach, describe, expect, it } from 'vitest'
import { ALL_SCOPES } from '@dokploy-mcp/core'
import { ConfigurationError, parseArguments, resolveOptions } from '../src/config.js'

const ENV_KEYS = ['DOKPLOY_URL', 'DOKPLOY_API_KEY', 'DOKPLOY_SCOPES']

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
})

describe('argument parsing', () => {
  it('reads flags written with an equals sign', () => {
    expect(parseArguments(['--url=https://panel.example.com'])).toEqual({
      url: 'https://panel.example.com',
    })
  })

  it('reads flags written as separate tokens', () => {
    expect(parseArguments(['--api-key', 'secret'])).toEqual({ 'api-key': 'secret' })
  })

  it('treats a trailing flag as a boolean switch', () => {
    expect(parseArguments(['--help'])).toEqual({ help: 'true' })
  })

  it('ignores positional arguments', () => {
    expect(parseArguments(['serve', '--url', 'https://panel.example.com'])).toEqual({
      url: 'https://panel.example.com',
    })
  })
})

describe('option resolution', () => {
  it('requires the panel address', () => {
    process.env.DOKPLOY_API_KEY = 'secret'
    expect(() => resolveOptions([])).toThrow(ConfigurationError)
  })

  it('requires the api key', () => {
    process.env.DOKPLOY_URL = 'https://panel.example.com'
    expect(() => resolveOptions([])).toThrow(ConfigurationError)
  })

  it('points the operator at the panel settings when the key is missing', () => {
    process.env.DOKPLOY_URL = 'https://panel.example.com'
    expect(() => resolveOptions([])).toThrow(/API Keys/)
  })

  it('reads both values from the environment', () => {
    process.env.DOKPLOY_URL = 'panel.example.com'
    process.env.DOKPLOY_API_KEY = 'secret'
    const options = resolveOptions([])
    expect(options.dokployUrl).toBe('https://panel.example.com')
    expect(options.apiKeys).toEqual(['secret'])
  })

  it('lets flags override the environment', () => {
    process.env.DOKPLOY_URL = 'https://from-env.example.com'
    process.env.DOKPLOY_API_KEY = 'from-env'
    const options = resolveOptions(['--url', 'https://from-flag.example.com', '--api-key', 'from-flag'])
    expect(options.dokployUrl).toBe('https://from-flag.example.com')
    expect(options.apiKeys).toEqual(['from-flag'])
  })

  it('accepts several api keys separated by commas', () => {
    const options = resolveOptions(['--url', 'https://panel.example.com', '--api-key', 'k1, k2,k1'])
    expect(options.apiKeys).toEqual(['k1', 'k2'])
  })

  it('normalizes a url pasted with a trailing api segment', () => {
    const options = resolveOptions(['--url', 'https://panel.example.com/api/', '--api-key', 'k'])
    expect(options.dokployUrl).toBe('https://panel.example.com')
  })

  it('grants every scope by default', () => {
    const options = resolveOptions(['--url', 'https://panel.example.com', '--api-key', 'k'])
    expect(options.scopes).toEqual([...ALL_SCOPES])
  })

  it('narrows the scopes when asked', () => {
    const options = resolveOptions([
      '--url',
      'https://panel.example.com',
      '--api-key',
      'k',
      '--scopes',
      'read,deploy',
    ])
    expect(options.scopes).toEqual(['read', 'deploy'])
  })

  it('drops unknown scopes rather than failing', () => {
    const options = resolveOptions([
      '--url',
      'https://panel.example.com',
      '--api-key',
      'k',
      '--scopes',
      'read wizard',
    ])
    expect(options.scopes).toEqual(['read'])
  })
})
