import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import config from '#config/dokploy_mcp'

const ALLOWED_HEADERS = [
  'authorization',
  'content-type',
  'mcp-session-id',
  'mcp-protocol-version',
  'last-event-id',
  'accept',
]

export default class CorsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const origin = ctx.request.header('origin')
    if (origin) {
      const allowed = origin === config.webUrl || origin === config.publicUrl
      ctx.response.header('Access-Control-Allow-Origin', allowed ? origin : '*')
      ctx.response.header('Vary', 'Origin')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      ctx.response.header('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '))
      ctx.response.header('Access-Control-Expose-Headers', 'Mcp-Session-Id, WWW-Authenticate')
      ctx.response.header('Access-Control-Max-Age', '86400')
    }

    if (ctx.request.method() === 'OPTIONS') {
      return ctx.response.status(204).send('')
    }

    return next()
  }
}
