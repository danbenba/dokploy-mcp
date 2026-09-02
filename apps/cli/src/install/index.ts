import { fetchAccountWithApiKey, normalizeBaseUrl } from '@dokploy-mcp/core'
import { parseArguments, splitList } from '../config.js'
import { showBanner } from '../ui/banner.js'
import { boxBottom, boxLine, boxRow, boxSeparator, boxTop, boxWidth } from '../ui/box.js'
import { ProgressBar } from '../ui/progress.js'
import { multiselect } from '../ui/prompt.js'
import { Spinner, loadingIntro } from '../ui/spinner.js'
import { chip, ui } from '../ui/theme.js'
import { CLIENTS, type ClientDefinition, type ServerSettings } from './clients.js'
import { openBrowser, startLogin, type CliCredentials } from './auth.js'

const DEFAULT_SERVER = 'https://mcp.dokploy.rest'
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000

interface InstallResult {
  client: ClientDefinition
  target: string
  error?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function credentialsFromFlags(url: string, keys: string[]): Promise<CliCredentials> {
  const spinner = new Spinner('Checking the API key', url).start()
  try {
    const organizations: CliCredentials['organizations'] = []
    let account: { name: string; email: string } | null = null
    for (const apiKey of keys) {
      const identity = await fetchAccountWithApiKey(url, apiKey)
      account ??= { name: identity.name, email: identity.email }
      organizations.push({
        id: identity.organizationId ?? `key-${organizations.length + 1}`,
        name: identity.organizationName,
        apiKey,
      })
    }
    spinner.succeed(`Signed in as ${ui.primary(account?.email || account?.name || 'unknown')}`)
    return {
      url,
      host: new URL(url).hostname,
      account: account ?? { name: '', email: '' },
      scopes: [],
      organizations,
    }
  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : String(error))
    throw error
  }
}

async function credentialsFromBrowser(server: string): Promise<CliCredentials> {
  const login = await startLogin(server)
  console.log(`  ${ui.text.bold('Sign in')} ${chip('browser')} ${ui.muted('a browser window opens to sign in to your Dokploy panel')}`)
  console.log(`  ${ui.muted('If nothing opens, visit:')}`)
  console.log(`  ${ui.secondary.underline(login.authorizeUrl)}\n`)
  openBrowser(login.authorizeUrl)
  const spinner = new Spinner('Waiting for sign-in', 'complete the steps in your browser').start()
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timed out waiting for the browser sign-in.')), LOGIN_TIMEOUT_MS)
  )
  try {
    const credentials = await Promise.race([login.waitForCredentials(), timeout])
    spinner.succeed(
      `Signed in as ${ui.primary(credentials.account.email || credentials.account.name)} on ${ui.primary(credentials.host)}`
    )
    return credentials
  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    login.close()
  }
}

export async function runInstall(argv: string[], version: string): Promise<void> {
  const flags = parseArguments(argv)
  const server = (flags.server ?? process.env.DOKPLOY_MCP_SERVER ?? DEFAULT_SERVER).replace(/\/+$/, '')
  const name = flags.name ?? 'dokploy'

  await loadingIntro(`Dokploy MCP v${version}`)
  showBanner(version)

  console.log(`  ${ui.muted('Server   :')} ${ui.primary(server)}`)
  console.log(`  ${ui.muted('Package  :')} ${ui.primary('dokploy-rest')} ${ui.muted(`v${version}`)}`)
  console.log(`  ${ui.muted('Entry    :')} ${ui.primary(name)}\n`)

  const scan = new Spinner('Scanning', 'looking for installed assistants').start()
  await sleep(600)
  const detected = CLIENTS.map((client) => ({ client, found: client.detect() }))
  const found = detected.filter((entry) => entry.found)
  scan.succeed(
    found.length
      ? `Found ${ui.primary(String(found.length))} assistant${found.length > 1 ? 's' : ''}: ${found.map((entry) => entry.client.label).join(', ')}`
      : 'No assistant detected, you can still pick the ones to configure'
  )
  console.log('')

  const selected = await multiselect(
    'Assistants to configure',
    detected.map(({ client, found: isFound }) => ({
      label: client.label,
      hint: isFound ? client.hint : 'not detected',
      value: client,
      selected: isFound,
    }))
  )
  if (selected.length === 0) {
    console.log(`\n  ${ui.warning('Nothing selected.')} ${ui.muted('Run the command again and pick at least one assistant.')}\n`)
    return
  }
  console.log('')

  const url = flags.url ?? process.env.DOKPLOY_URL
  const rawKeys = flags['api-key'] ?? process.env.DOKPLOY_API_KEY
  const credentials =
    url && rawKeys
      ? await credentialsFromFlags(normalizeBaseUrl(url), splitList(rawKeys))
      : await credentialsFromBrowser(server)
  const organizations = credentials.organizations
  console.log(
    `  ${ui.muted('Organizations:')} ${organizations.map((organization) => ui.primary(organization.name ?? organization.id)).join(ui.border(' · '))}\n`
  )

  const settings: ServerSettings = {
    name,
    url: credentials.url,
    apiKeys: organizations.map((organization) => organization.apiKey),
  }

  const bar = new ProgressBar('Installing', selected.length).start()
  const results: InstallResult[] = []
  for (const client of selected) {
    await sleep(220)
    try {
      const target = client.install(settings)
      results.push({ client, target })
      bar.log(`  ${ui.success('✓')} ${client.label} ${ui.muted(target)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ client, target: client.target(), error: message })
      bar.log(`  ${ui.error('✗')} ${client.label} ${ui.muted(message)}`)
    }
    bar.advance(client.label)
  }
  const failures = results.filter((result) => result.error)
  await bar.finish(
    failures.length
      ? `${results.length - failures.length}/${results.length} assistants configured`
      : `${results.length} assistant${results.length > 1 ? 's' : ''} configured`
  )

  const w = boxWidth()
  console.log('')
  console.log(boxTop(w))
  console.log(boxLine(w, `${ui.text.bold('  Dokploy MCP')} ${chip(failures.length ? 'partial' : 'done')}`))
  console.log(boxSeparator(w))
  console.log(boxRow(w, 'Panel', credentials.url))
  console.log(boxRow(w, 'Account', credentials.account.email || credentials.account.name))
  console.log(boxRow(w, 'Organizations', organizations.map((organization) => organization.name ?? organization.id).join(', ')))
  console.log(boxSeparator(w))
  for (const result of results) {
    const status = result.error ? ui.error('✗') : ui.success('✓')
    console.log(boxLine(w, `${status} ${ui.text(result.client.label.padEnd(15))} ${ui.muted(result.error ?? result.target)}`))
  }
  console.log(boxBottom(w))
  console.log('')
  console.log(`  ${ui.muted('note:')} ${ui.muted('restart the desktop apps so they pick up the new server. Try "list my Dokploy projects" in your assistant.')}`)
  console.log(`  ${ui.muted('note:')} ${ui.muted('revoke access at any time by deleting the API keys in your Dokploy panel, Settings then API Keys.')}\n`)
}
