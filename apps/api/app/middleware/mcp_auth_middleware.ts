import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import config from '#config/dokploy_mcp'
import { isSessionRevoked, openAccess, TokenError, type AccessPayload } from '#oauth/tokens'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    mcpAccess?: AccessPayload
  }
}

export default class McpAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const header = ctx.request.header('authorization') ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(header.trim())

    const challenge = (error: string, description: string) => {
      ctx.response.header(
        'WWW-Authenticate',
        `Bearer realm="${config.brandName}", error="${error}", error_description="${description}", resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource"`
      )
      return ctx.response.status(401).json({ error, error_description: description })
    }

    if (!match) {
      return challenge('unauthorized', 'A bearer access token is required to reach this MCP server.')
    }

    try {
      const access = await openAccess(match[1])
      if (isSessionRevoked(access.sessionId)) {
        return challenge('invalid_token', 'This access token has been revoked.')
      }
      ctx.mcpAccess = access
    } catch (error) {
      if (error instanceof TokenError) {
        return challenge(
          'invalid_token',
          error.code === 'expired'
            ? 'The access token has expired. Refresh it and try again.'
            : 'The access token is invalid.'
        )
      }
      throw error
    }

    return next()
  }
}
