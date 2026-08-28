import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { HttpContext } from '@adonisjs/core/http'
import { DokployClient, createMcpServer } from '@dokploy-mcp/core'

export default class McpController {
  async handle({ request, response, mcpAccess }: HttpContext) {
    if (!mcpAccess) {
      return response.status(401).json({ error: 'unauthorized' })
    }

    const { connection, scopes } = mcpAccess
    const client = new DokployClient({ baseUrl: connection.url, apiKey: connection.apiKey })
    const server = createMcpServer({
      client,
      scopes,
      account: connection.account,
      instanceUrl: connection.url,
    })
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    const dispose = () => {
      void transport.close()
      void server.close()
    }
    response.response.on('close', dispose)

    try {
      await server.connect(transport)
      await transport.handleRequest(request.request, response.response, request.body())
    } catch (error) {
      dispose()
      if (!response.response.headersSent) {
        return response.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal MCP server error.',
          },
          id: null,
        })
      }
    }
  }

  async unsupported({ response }: HttpContext) {
    response.header('Allow', 'POST')
    return response.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'This MCP server is stateless: use POST for every JSON-RPC message.',
      },
      id: null,
    })
  }
}
