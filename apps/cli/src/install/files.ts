import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {}
  }
  const text = readFileSync(path, 'utf8').trim()
  if (!text) {
    return {}
  }
  const parsed = JSON.parse(text) as unknown
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}

export function writeJson(path: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true })
  if (existsSync(path)) {
    copyFileSync(path, `${path}.bak`)
  }
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

export function mergeServer(
  path: string,
  collectionKey: string,
  name: string,
  entry: Record<string, unknown>
): void {
  const data = readJson(path)
  const existing = data[collectionKey]
  const collection =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {}
  data[collectionKey] = { ...collection, [name]: entry }
  writeJson(path, data)
}
