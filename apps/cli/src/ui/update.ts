import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { confirm } from './prompt.js'
import { isInteractive, ui } from './theme.js'

const PACKAGE = 'dokploy-rest'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

interface UpdateCache {
  checkedAt: number
  latest: string | null
}

function cachePath(): string {
  const base =
    process.platform === 'win32'
      ? (process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'))
      : (process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'))
  return join(base, PACKAGE, 'update-check.json')
}

function readCache(): UpdateCache | null {
  try {
    const path = cachePath()
    if (!existsSync(path)) {
      return null
    }
    return JSON.parse(readFileSync(path, 'utf8')) as UpdateCache
  } catch {
    return null
  }
}

function writeCache(cache: UpdateCache): void {
  try {
    const path = cachePath()
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, JSON.stringify(cache))
  } catch {
    return
  }
}

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part))
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0
    const right = b[index] ?? 0
    if (left > right) {
      return true
    }
    if (left < right) {
      return false
    }
  }
  return false
}

async function fetchLatest(): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE}/latest`, {
      signal: AbortSignal.timeout(2500),
      headers: { accept: 'application/json' },
    })
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as { version?: string }
    return typeof data.version === 'string' ? data.version : null
  } catch {
    return null
  }
}

export async function checkForUpdates(current: string): Promise<string | null> {
  if (process.env.DOKPLOY_REST_NO_UPDATE_CHECK) {
    return null
  }
  const cached = readCache()
  let latest = cached && Date.now() - cached.checkedAt < CACHE_TTL_MS ? cached.latest : undefined
  if (latest === undefined) {
    latest = await fetchLatest()
    writeCache({ checkedAt: Date.now(), latest })
  }
  return latest && isNewerVersion(latest, current) ? latest : null
}

function runsThroughNpx(): boolean {
  const script = process.argv[1] ?? ''
  const agent = process.env.npm_config_user_agent ?? ''
  return script.includes('_npx') || agent.includes('npx')
}

export async function showUpdateNotice(current: string): Promise<void> {
  const latest = await checkForUpdates(current)
  if (!latest) {
    return
  }
  const viaNpx = runsThroughNpx()
  const command = viaNpx ? `npx -y ${PACKAGE}@latest install` : `npm i -g ${PACKAGE}@latest`
  console.log(`  ${ui.warning('↳')} Update available: ${ui.muted(current)} -> ${ui.success(latest)}`)
  if (viaNpx || !isInteractive) {
    console.log(`  ${ui.muted('  Run:')} ${ui.primarySoft(command)}\n`)
    return
  }
  let wanted = false
  try {
    wanted = await confirm('Update now?', true)
  } catch {
    wanted = false
  }
  if (!wanted) {
    console.log('')
    return
  }
  console.log(`  ${ui.muted('Updating:')} ${ui.primarySoft(command)}\n`)
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['i', '-g', `${PACKAGE}@latest`], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status === 0) {
    console.log(`\n  ${ui.success('✓')} Updated. Re-run your command to use the new version.\n`)
    process.exit(0)
  }
  console.log(`\n  ${ui.error('✗')} Update failed. Run manually: ${ui.primarySoft(command)}\n`)
}
