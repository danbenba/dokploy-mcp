import { ALL_SCOPES, normalizeBaseUrl, sanitizeScopes, type Scope } from '@dokploy-mcp/core'

export interface CliOptions {
  dokployUrl: string
  apiKey: string
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

export function resolveOptions(argv: string[]): CliOptions {
  const flags = parseArguments(argv)

  const url = flags.url ?? readEnv('DOKPLOY_URL')
  const apiKey = flags['api-key'] ?? readEnv('DOKPLOY_API_KEY')

  if (!url) {
    throw new ConfigurationError(
      'Missing the Dokploy panel address. Set DOKPLOY_URL or pass --url https://panel.example.com'
    )
  }
  if (!apiKey) {
    throw new ConfigurationError(
      'Missing the Dokploy API key. Set DOKPLOY_API_KEY or pass --api-key, after generating one in Dokploy under Settings, then API Keys.'
    )
  }

  const requested = flags.scopes ?? readEnv('DOKPLOY_SCOPES')
  const scopes = requested
    ? sanitizeScopes(requested.split(/[\s,+]+/).filter(Boolean))
    : ([...ALL_SCOPES] as Scope[])

  return { dokployUrl: normalizeBaseUrl(url), apiKey, scopes }
}

export const HELP_TEXT = `dokploy-mcp — Model Context Protocol server for Dokploy

Usage
  dokploy-mcp [options]

Options
  --url <url>          Address of your Dokploy panel (or DOKPLOY_URL)
  --api-key <key>      API key from Dokploy, Settings then API Keys (or DOKPLOY_API_KEY)
  --scopes <list>      Limit the tools exposed to the assistant. Defaults to every scope.
                       Available: ${ALL_SCOPES.join(', ')}
  --version            Print the version and exit
  --help               Print this help and exit

The server speaks MCP over stdio, so it is started by your assistant rather than by hand.

Claude Code
  claude mcp add dokploy \\
    -e DOKPLOY_URL=https://panel.example.com \\
    -e DOKPLOY_API_KEY=your-key \\
    -- npx -y dokploy-mcp

Claude Desktop, in claude_desktop_config.json
  {
    "mcpServers": {
      "dokploy": {
        "command": "npx",
        "args": ["-y", "dokploy-mcp"],
        "env": {
          "DOKPLOY_URL": "https://panel.example.com",
          "DOKPLOY_API_KEY": "your-key"
        }
      }
    }
  }

To connect a panel without handing over an API key, use the hosted connector at
https://dokploy.rest instead: it signs you in and creates a scoped key for you.
`
