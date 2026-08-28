import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  DokployClient,
  createMcpServer,
  fetchAccountWithApiKey,
  type DokployAccount,
} from '@dokploy-mcp/core'
import { ConfigurationError, HELP_TEXT, resolveOptions } from './config.js'

const VERSION = '0.1.0'

async function identify(url: string, apiKey: string): Promise<DokployAccount> {
  try {
    return await fetchAccountWithApiKey(url, apiKey)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new ConfigurationError(`Could not authenticate against ${url}: ${reason}`)
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP_TEXT)
    return
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${VERSION}\n`)
    return
  }

  const options = resolveOptions(argv)
  const account = await identify(options.dokployUrl, options.apiKey)

  process.stderr.write(
    `dokploy-mcp ${VERSION} connected to ${options.dokployUrl} as ${account.email || account.name} ` +
      `with scopes ${options.scopes.join(', ')}\n`
  )

  const client = new DokployClient({ baseUrl: options.dokployUrl, apiKey: options.apiKey })
  const server = createMcpServer({
    client,
    scopes: options.scopes,
    account,
    instanceUrl: options.dokployUrl,
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  const shutdown = () => {
    void server.close().finally(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n\nRun dokploy-mcp --help for the available options.\n`)
  process.exit(1)
})
