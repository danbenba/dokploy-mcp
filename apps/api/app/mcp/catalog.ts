import rawCatalog from './catalog.json' with { type: 'json' }

export interface CatalogParam {
  type: string
  required?: boolean
  enum?: unknown[]
  default?: unknown
}

export interface CatalogEntry {
  method: 'GET' | 'POST'
  params?: Record<string, CatalogParam>
  desc?: string
}

export interface CatalogHit extends CatalogEntry {
  path: string
  score: number
}

const catalog = rawCatalog as unknown as {
  dokploy_version: string
  count: number
  endpoints: Record<string, CatalogEntry>
}

export function catalogVersion(): string {
  return catalog.dokploy_version
}

export function catalogCount(): number {
  return catalog.count
}

export function describeEndpoint(path: string): (CatalogEntry & { path: string }) | null {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const entry = catalog.endpoints[normalized]
  return entry ? { path: normalized, ...entry } : null
}

export function findEndpoints(query: string, limit = 25): CatalogHit[] {
  const terms = query
    .toLowerCase()
    .replace(/[/.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const scored: CatalogHit[] = []
  for (const [path, entry] of Object.entries(catalog.endpoints)) {
    const haystack = path.toLowerCase()
    const params = Object.keys(entry.params ?? {})
      .join(' ')
      .toLowerCase()
    let score = 0
    for (const term of terms) {
      if (haystack.includes(term)) {
        score += 3
        if (haystack.includes(`.${term}`) || haystack.endsWith(term)) {
          score += 2
        }
      }
      if (params.includes(term)) {
        score += 1
      }
    }
    if (score > 0) {
      scored.push({ path, score, ...entry })
    }
  }
  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
  return scored.slice(0, limit)
}
