import type { HttpContext } from '@adonisjs/core/http'
import config from '#config/dokploy_mcp'
import { ALL_SCOPES, SERVER_NAME, SERVER_VERSION, catalogCount, catalogVersion } from '@dokploy-mcp/core'

export default class MetadataController {
  async authorizationServer({ response }: HttpContext) {
    return response.json({
      issuer: config.publicUrl,
      authorization_endpoint: `${config.publicUrl}/oauth/authorize`,
      token_endpoint: `${config.publicUrl}/oauth/token`,
      registration_endpoint: `${config.publicUrl}/oauth/register`,
      revocation_endpoint: `${config.publicUrl}/oauth/revoke`,
      service_documentation: config.webUrl,
      scopes_supported: ALL_SCOPES,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
    })
  }

  async protectedResource({ response }: HttpContext) {
    return response.json({
      resource: config.resourceUrl,
      resource_name: config.brandName,
      authorization_servers: [config.publicUrl],
      scopes_supported: ALL_SCOPES,
      bearer_methods_supported: ['header'],
      resource_documentation: config.webUrl,
    })
  }

  async health({ response }: HttpContext) {
    return response.json({
      status: 'ok',
      server: SERVER_NAME,
      version: SERVER_VERSION,
      dokploy_catalog: { version: catalogVersion(), endpoints: catalogCount() },
      locked_instance: config.lockedDokployUrl,
    })
  }

  async index({ response }: HttpContext) {
    return response.json({
      name: config.brandName,
      description:
        'Model Context Protocol server for Dokploy. Connect Claude or ChatGPT to your own Dokploy panel.',
      mcp_endpoint: config.resourceUrl,
      authorization_server: config.publicUrl,
      documentation: config.webUrl,
    })
  }
}
