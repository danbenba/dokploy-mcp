import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const WINDOW_MS = Number(env.get('RATE_LIMIT_WINDOW_MS') ?? 60_000)
const MAX_REQUESTS = Number(env.get('RATE_LIMIT_MAX') ?? 60)

function prune(now: number): void {
  if (buckets.size < 5_000) {
    return
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function consume(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
  prune(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }
  bucket.count += 1
  if (bucket.count > MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

export function resetRateLimits(): void {
  buckets.clear()
}

export default class RateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const clientIp = ctx.request.header('cf-connecting-ip') ?? ctx.request.ip()
    const key = `${clientIp}:${ctx.request.url()}`
    const result = consume(key)
    if (!result.allowed) {
      ctx.response.header('Retry-After', String(result.retryAfter))
      return ctx.response.status(429).json({
        error: 'too_many_requests',
        error_description: 'Too many attempts. Wait a moment and try again.',
      })
    }
    return next()
  }
}
