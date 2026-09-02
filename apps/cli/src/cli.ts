import { createRequire } from 'node:module'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  DokployOrgPool,
  createMcpServer,
  fetchAccountWithApiKey,
  type DokployAccount,
  type OrganizationCredential,
} from '@dokploy-mcp/core'
import { ConfigurationError, HELP_TEXT, resolveOptions } from './config.js'
import { runInstall } from './install/index.js'
import { checkForUpdates } from './ui/update.js'

const require = createRequire(import.meta.url)
const VERSION: string = require('../package.json').version

async function identify(url: string, apiKey: string): Promise<DokployAccount> {
  try {
    return await fetchAccountWithApiKey(url, apiKey)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new ConfigurationError(`Could not authenticate against ${url}: ${reason}`)
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv[0] === 'install') {
    await runInstall(argv.slice(1), VERSION)
    return
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP_TEXT)
    return
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${VERSION}\n`)
    return
  }

  const options = resolveOptions(argv)
  const credentials: OrganizationCredential[] = []
  let account: DokployAccount | null = null
  for (const apiKey of options.apiKeys) {
    const identity = await identify(options.dokployUrl, apiKey)
    account ??= identity
    const organizationId = identity.organizationId ?? `key-${credentials.length + 1}`
    if (credentials.some((credential) => credential.id === organizationId)) {
      continue
    }
    credentials.push({ id: organizationId, name: identity.organizationName, apiKey })
  }
  if (!account) {
    throw new ConfigurationError('No usable API key was provided.')
  }

  const latest = await checkForUpdates(VERSION)
  if (latest) {
    process.stderr.write(`dokploy-rest ${VERSION} is outdated, ${latest} is available: npx -y dokploy-rest@latest\n`)
  }

  const pool = new DokployOrgPool(options.dokployUrl, credentials)
  const organizations = pool.organizations.map(({ id, name }) => ({ id, name }))
  process.stderr.write(
    `dokploy-rest ${VERSION} connected to ${options.dokployUrl} as ${account.email || account.name} ` +
      `across ${organizations.length} organization${organizations.length > 1 ? 's' : ''} ` +
      `with scopes ${options.scopes.join(', ')}\n`
  )

  const server = createMcpServer({
    client: pool,
    organizations: pool.organizations,
    scopes: options.scopes,
    account: {
      ...account,
      organizations,
    },
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
  process.stderr.write(`${message}\n\nRun dokploy-rest --help for the available options.\n`)
  process.exit(1)
})
