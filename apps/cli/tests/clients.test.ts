import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const home = mkdtempSync(join(tmpdir(), 'dokploy-rest-'))
process.env.HOME = home
process.env.USERPROFILE = home
process.env.PATH = ''
process.env.XDG_CONFIG_HOME = join(home, '.config')

const settings = {
  name: 'dokploy',
  url: 'https://panel.example.com',
  apiKeys: ['key-a', 'key-b'],
}

let CLIENTS: (typeof import('../src/install/clients.js'))['CLIENTS']

function client(id: string) {
  const found = CLIENTS.find((entry) => entry.id === id)
  if (!found) {
    throw new Error(`missing client ${id}`)
  }
  return found
}

beforeAll(async () => {
  CLIENTS = (await import('../src/install/clients.js')).CLIENTS
})

describe('assistant config writers', () => {
  it('merges into an existing cursor config without losing other servers', () => {
    mkdirSync(join(home, '.cursor'), { recursive: true })
    const path = join(home, '.cursor', 'mcp.json')
    writeFileSync(path, JSON.stringify({ mcpServers: { other: { command: 'x' } } }))
    expect(client('cursor').detect()).toBe(true)
    client('cursor').install(settings)
    const data = JSON.parse(readFileSync(path, 'utf8'))
    expect(data.mcpServers.other.command).toBe('x')
    expect(data.mcpServers.dokploy.args).toEqual(['-y', 'dokploy-rest'])
    expect(data.mcpServers.dokploy.env.DOKPLOY_API_KEY).toBe('key-a,key-b')
    expect(existsSync(`${path}.bak`)).toBe(true)
  })

  it('writes vs code entries under servers with a stdio type', () => {
    client('vscode').install(settings)
    const target = client('vscode').target()
    const data = JSON.parse(readFileSync(target, 'utf8'))
    expect(data.servers.dokploy.type).toBe('stdio')
    expect(data.servers.dokploy.env.DOKPLOY_URL).toBe('https://panel.example.com')
  })

  it('keeps zed settings that contain comments', () => {
    const target = client('zed').target()
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, '{\n  // theme\n  "theme": "One Dark",\n  "context_servers": {},\n}\n')
    client('zed').install(settings)
    const data = JSON.parse(readFileSync(target, 'utf8'))
    expect(data.theme).toBe('One Dark')
    expect(data.context_servers.dokploy.source).toBe('custom')
  })

  it('rewrites the codex toml section idempotently', () => {
    const target = client('codex').target()
    mkdirSync(join(target, '..'), { recursive: true })
    writeFileSync(target, 'model = "gpt-5"\n\n[mcp_servers.dokploy]\ncommand = "old"\n\n[mcp_servers.dokploy.env]\nDOKPLOY_URL = "old"\n')
    client('codex').install(settings)
    client('codex').install(settings)
    const text = readFileSync(target, 'utf8')
    expect(text.startsWith('model = "gpt-5"')).toBe(true)
    expect(text.match(/\[mcp_servers\.dokploy\]/g)).toHaveLength(1)
    expect(text).toContain('DOKPLOY_API_KEY = "key-a,key-b"')
    expect(text).not.toContain('"old"')
  })

  it('creates the claude desktop config from scratch', () => {
    const target = client('claude-desktop').target()
    client('claude-desktop').install(settings)
    const data = JSON.parse(readFileSync(target, 'utf8'))
    expect(data.mcpServers.dokploy.command).toMatch(/^npx/)
    expect(data.mcpServers.dokploy.type).toBeUndefined()
  })

  it('falls back to ~/.claude.json when the claude binary is absent', () => {
    client('claude-code').install(settings)
    const data = JSON.parse(readFileSync(join(home, '.claude.json'), 'utf8'))
    expect(data.mcpServers.dokploy.type).toBe('stdio')
  })
})
