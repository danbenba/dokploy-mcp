export function normalizeBaseUrl(input: string): string {
  let candidate = input.trim()
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`
  }
  const parsed = new URL(candidate)
  parsed.hash = ''
  parsed.search = ''
  parsed.username = ''
  parsed.password = ''
  let pathname = parsed.pathname.replace(/\/+$/, '')
  if (pathname.endsWith('/api')) {
    pathname = pathname.slice(0, -4)
  }
  parsed.pathname = pathname
  return parsed.toString().replace(/\/+$/, '')
}
