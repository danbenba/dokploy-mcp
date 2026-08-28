import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { TokenError } from '#oauth/tokens'
import {
  DokployApiError,
  DokployAuthError,
  InstanceVerificationError,
} from '@dokploy-mcp/core'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction
  protected renderStatusPages = app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof InstanceVerificationError) {
      return ctx.response.status(422).json({ error: error.code, error_description: error.message })
    }
    if (error instanceof DokployAuthError) {
      const status = error.code === 'unreachable' ? 502 : 401
      return ctx.response.status(status).json({ error: error.code, error_description: error.message })
    }
    if (error instanceof TokenError) {
      const status = error.code === 'expired' ? 410 : 400
      return ctx.response.status(status).json({ error: error.code, error_description: error.message })
    }
    if (error instanceof DokployApiError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502
      return ctx.response.status(status).json({
        error: 'dokploy_error',
        error_description: error.message,
        path: error.path,
      })
    }
    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    if (
      error instanceof InstanceVerificationError ||
      error instanceof DokployAuthError ||
      error instanceof TokenError
    ) {
      return
    }
    return super.report(error, ctx)
  }
}
