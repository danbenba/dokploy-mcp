import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, accessSync, constants } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { mergeServer } from './files.js'

export interface ServerSettings {
  name: string
  url: string
  apiKeys: string[]
  scopes?: string[]
}

export interface ClientDefinition {
  id: string
  label: string
  hint: string
  detect: () => boolean
  target: () => string
  install: (settings: ServerSettings) => string
}

const HOME = homedir()
const OS = platform()

function appData(): string {
  return process.env.APPDATA ?? join(HOME, 'AppData', 'Roaming')
}

function configHome(): string {
  return process.env.XDG_CONFIG_HOME ?? join(HOME, '.config')
}

function userDir(product: string): string {
  if (OS === 'darwin') {
    return join(HOME, 'Library', 'Application Support', product, 'User')
  }
  if (OS === 'win32') {
    return join(appData(), product, 'User')
  }
  return join(configHome(), product, 'User')
}

function onPath(binary: string): boolean {
  const entries = (process.env.PATH ?? '').split(OS === 'win32' ? ';' : ':').filter(Boolean)
  const names = OS === 'win32' ? [`${binary}.cmd`, `${binary}.exe`, binary] : [binary]
  for (const entry of entries) {
    for (const name of names) {
      try {
        accessSync(join(entry, name), constants.X_OK)
        return true
      } catch {
        continue
      }
    }
  }
  return false
}

function envOf(settings: ServerSettings): Record<string, string> {
  const env: Record<string, string> = {
    DOKPLOY_URL: settings.url,
    DOKPLOY_API_KEY: settings.apiKeys.join(','),
  }
  if (settings.scopes && settings.scopes.length > 0) {
    env.DOKPLOY_SCOPES = settings.scopes.join(',')
  }
  return env
}

function npxCommand(): string {
  return OS === 'win32' ? 'npx.cmd' : 'npx'
}

function stdioEntry(settings: ServerSettings, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { command: npxCommand(), args: ['-y', 'dokploy-rest'], env: envOf(settings), ...extra }
}

function claudeDesktopPath(): string {
  if (OS === 'darwin') {
    return join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  }
  if (OS === 'win32') {
    return join(appData(), 'Claude', 'claude_desktop_config.json')
  }
  return join(configHome(), 'Claude', 'claude_desktop_config.json')
}

function zedPath(): string {
  if (OS === 'win32') {
    return join(appData(), 'Zed', 'settings.json')
  }
  return join(configHome(), 'zed', 'settings.json')
}

function stripJsonComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1')
}

function writeCodexToml(path: string, settings: ServerSettings): void {
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const cleaned = existing
    .replace(/\n?\[mcp_servers\.dokploy(\.env)?\][^\[]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
  const env = Object.entries(envOf(settings))
    .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
    .join('\n')
  const block = `[mcp_servers.dokploy]\ncommand = ${JSON.stringify(npxCommand())}\nargs = ["-y", "dokploy-rest"]\n\n[mcp_servers.dokploy.env]\n${env}\n`
  mkdirSync(dirname(path), { recursive: true })
  if (existsSync(path)) {
    copyFileSync(path, `${path}.bak`)
  }
  writeFileSync(path, `${cleaned ? `${cleaned}\n\n` : ''}${block}`)
}

export const CLIENTS: ClientDefinition[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    hint: 'user scope',
    detect: () => onPath('claude') || existsSync(join(HOME, '.claude')) || existsSync(join(HOME, '.claude.json')),
    target: () => (onPath('claude') ? 'claude mcp add-json --scope user' : join(HOME, '.claude.json')),
    install: (settings) => {
      const entry = stdioEntry(settings, { type: 'stdio' })
      if (onPath('claude')) {
        const result = spawnSync('claude', ['mcp', 'add-json', settings.name, JSON.stringify(entry), '--scope', 'user'], {
          encoding: 'utf8',
          shell: OS === 'win32',
        })
        if (result.status !== 0) {
          throw new Error((result.stderr || result.stdout || 'claude mcp add-json failed').trim())
        }
        return 'claude mcp add-json'
      }
      const path = join(HOME, '.claude.json')
      mergeServer(path, 'mcpServers', settings.name, entry)
      return path
    },
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    hint: 'claude_desktop_config.json',
    detect: () =>
      existsSync(dirname(claudeDesktopPath())) ||
      (OS === 'darwin' && existsSync('/Applications/Claude.app')),
    target: claudeDesktopPath,
    install: (settings) => {
      const path = claudeDesktopPath()
      mergeServer(path, 'mcpServers', settings.name, stdioEntry(settings))
      return path
    },
  },
  {
    id: 'cursor',
    label: 'Cursor',
    hint: '~/.cursor/mcp.json',
    detect: () => existsSync(join(HOME, '.cursor')) || onPath('cursor'),
    target: () => join(HOME, '.cursor', 'mcp.json'),
    install: (settings) => {
      const path = join(HOME, '.cursor', 'mcp.json')
      mergeServer(path, 'mcpServers', settings.name, stdioEntry(settings))
      return path
    },
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    hint: '~/.codeium/windsurf/mcp_config.json',
    detect: () => existsSync(join(HOME, '.codeium', 'windsurf')) || onPath('windsurf'),
    target: () => join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
    install: (settings) => {
      const path = join(HOME, '.codeium', 'windsurf', 'mcp_config.json')
      mergeServer(path, 'mcpServers', settings.name, stdioEntry(settings))
      return path
    },
  },
  {
    id: 'vscode',
    label: 'VS Code',
    hint: 'Copilot agent mode, user mcp.json',
    detect: () => existsSync(userDir('Code')) || onPath('code'),
    target: () => join(userDir('Code'), 'mcp.json'),
    install: (settings) => {
      const path = join(userDir('Code'), 'mcp.json')
      mergeServer(path, 'servers', settings.name, stdioEntry(settings, { type: 'stdio' }))
      return path
    },
  },
  {
    id: 'zed',
    label: 'Zed',
    hint: 'settings.json context_servers',
    detect: () => existsSync(dirname(zedPath())) || onPath('zed'),
    target: zedPath,
    install: (settings) => {
      const path = zedPath()
      const raw = existsSync(path) ? readFileSync(path, 'utf8') : '{}'
      const data = JSON.parse(stripJsonComments(raw) || '{}') as Record<string, unknown>
      const servers =
        data.context_servers && typeof data.context_servers === 'object'
          ? (data.context_servers as Record<string, unknown>)
          : {}
      data.context_servers = { ...servers, [settings.name]: stdioEntry(settings, { source: 'custom' }) }
      mkdirSync(dirname(path), { recursive: true })
      if (existsSync(path)) {
        copyFileSync(path, `${path}.bak`)
      }
      writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
      return path
    },
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    hint: '~/.gemini/settings.json',
    detect: () => existsSync(join(HOME, '.gemini')) || onPath('gemini'),
    target: () => join(HOME, '.gemini', 'settings.json'),
    install: (settings) => {
      const path = join(HOME, '.gemini', 'settings.json')
      mergeServer(path, 'mcpServers', settings.name, stdioEntry(settings))
      return path
    },
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    hint: '~/.codex/config.toml',
    detect: () => existsSync(process.env.CODEX_HOME ?? join(HOME, '.codex')) || onPath('codex'),
    target: () => join(process.env.CODEX_HOME ?? join(HOME, '.codex'), 'config.toml'),
    install: (settings) => {
      const path = join(process.env.CODEX_HOME ?? join(HOME, '.codex'), 'config.toml')
      writeCodexToml(path, settings)
      return path
    },
  },
]
