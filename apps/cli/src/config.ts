import { ALL_SCOPES, normalizeBaseUrl, sanitizeScopes, type Scope } from '@dokploy-mcp/core'

export interface CliOptions {
  dokployUrl: string
  apiKeys: string[]
  scopes: Scope[]
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]
  return value === undefined || value.trim() === '' ? undefined : value.trim()
}

export function parseArguments(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) {
      continue
    }
    const [flag, inlineValue] = argument.slice(2).split('=')
    if (inlineValue !== undefined) {
      parsed[flag] = inlineValue
      continue
    }
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      parsed[flag] = next
      index += 1
    } else {
      parsed[flag] = 'true'
    }
  }
  return parsed
}

export function splitList(value: string): string[] {
  return [...new Set(value.split(/[\s,+]+/).map((item) => item.trim()).filter(Boolean))]
}

export function resolveOptions(argv: string[]): CliOptions {
  const flags = parseArguments(argv)

  const url = flags.url ?? readEnv('DOKPLOY_URL')
  const rawKeys = flags['api-key'] ?? readEnv('DOKPLOY_API_KEY')

  if (!url) {
    throw new ConfigurationError(
      'Missing the Dokploy panel address. Set DOKPLOY_URL or pass --url https://panel.example.com'
    )
  }
  const apiKeys = rawKeys ? splitList(rawKeys) : []
  if (apiKeys.length === 0) {
    throw new ConfigurationError(
      'Missing the Dokploy API key. Set DOKPLOY_API_KEY or pass --api-key, after generating one in Dokploy under Settings, then API Keys.'
    )
  }

  const requested = flags.scopes ?? readEnv('DOKPLOY_SCOPES')
  const scopes = requested ? sanitizeScopes(splitList(requested)) : ([...ALL_SCOPES] as Scope[])

  return { dokployUrl: normalizeBaseUrl(url), apiKeys, scopes }
}

export const HELP_TEXT = `dokploy-rest — Model Context Protocol server for Dokploy

Usage
  dokploy-rest install        Guided setup: sign in from the browser, then configure
                              Claude Code, Claude Desktop, Cursor, Windsurf, VS Code,
                              Zed, Gemini CLI and Codex in one go
  dokploy-rest [options]      Run the MCP server over stdio (started by your assistant)

Install options
  --server <url>       Authorization server to sign in through (default https://mcp.dokploy.rest)
  --url, --api-key     Skip the browser sign-in and use these credentials directly
  --name <name>        Server entry name written into each assistant (default dokploy)

Server options
  --url <url>          Address of your Dokploy panel (or DOKPLOY_URL)
  --api-key <keys>     API key from Dokploy, Settings then API Keys (or DOKPLOY_API_KEY).
                       Pass several keys separated by commas to reach several organizations.
  --scopes <list>      Limit the tools exposed to the assistant. Defaults to every scope.
                       Available: ${ALL_SCOPES.join(', ')}
  --version            Print the version and exit
  --help               Print this help and exit

The server speaks MCP over stdio, so it is started by your assistant rather than by hand.

Claude Code
  claude mcp add dokploy \\
    -e DOKPLOY_URL=https://panel.example.com \\
    -e DOKPLOY_API_KEY=your-key \\
    -- npx -y dokploy-rest

Claude Desktop, in claude_desktop_config.json
  {
    "mcpServers": {
      "dokploy": {
        "command": "npx",
        "args": ["-y", "dokploy-rest"],
        "env": {
          "DOKPLOY_URL": "https://panel.example.com",
          "DOKPLOY_API_KEY": "your-key"
        }
      }
    }
  }

To connect a panel without handing over an API key, use the hosted connector at
https://dokploy.rest instead: it signs you in, lets you pick your organizations and
creates a scoped key for each of them.
`
