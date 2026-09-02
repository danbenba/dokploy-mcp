import type { HttpContext } from '@adonisjs/core/http'

export default class CliController {
  async credentials({ response, mcpAccess }: HttpContext) {
    if (!mcpAccess) {
      return response.status(401).json({ error: 'unauthorized' })
    }
    const { connection, scopes } = mcpAccess
    const organizations = connection.organizations?.length
      ? connection.organizations
      : [
          {
            id: connection.account.organizationId ?? 'default',
            name: connection.account.organizationName,
            apiKey: connection.apiKey,
          },
        ]
    return response.json({
      url: connection.url,
      host: connection.host,
      account: { name: connection.account.name, email: connection.account.email },
      scopes,
      organizations,
    })
  }
}
