export class DokployApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(status: number, path: string, message: string) {
    super(message)
    this.name = 'DokployApiError'
    this.status = status
    this.path = path
  }
}

export class DokployAuthError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'DokployAuthError'
    this.code = code
  }
}

export class InstanceVerificationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'InstanceVerificationError'
    this.code = code
  }
}

export function extractErrorMessage(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as Record<string, unknown>
    if (data && typeof data === 'object') {
      const issues = Array.isArray(data.issues)
        ? (data.issues as Array<{ path?: unknown[]; message?: string }>)
            .slice(0, 5)
            .map((issue) => {
              const location = Array.isArray(issue.path) ? issue.path.join('.') : ''
              return location ? `${location}: ${issue.message ?? '?'}` : (issue.message ?? '?')
            })
            .join('; ')
        : ''
      const message = typeof data.message === 'string' ? data.message : ''
      const fallback = typeof data.error === 'string' ? data.error : ''
      const combined = [message || fallback, issues].filter(Boolean).join(' — ')
      if (combined) {
        return combined
      }
    }
  } catch {
    return body.slice(0, 300) || `HTTP ${status}`
  }
  return body.slice(0, 300) || `HTTP ${status}`
}
