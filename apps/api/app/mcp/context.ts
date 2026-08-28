import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type DokployClient from '#services/dokploy/client'
import type { DokployAccount } from '#services/dokploy/authenticator'
import type { Scope } from '#oauth/scopes'
import { hasScope } from '#oauth/scopes'

export interface McpContext {
  client: DokployClient
  scopes: Scope[]
  account: DokployAccount
  instanceUrl: string
}

export interface ToolModule {
  register(server: McpServer, context: McpContext): void
}

export class ScopeDeniedError extends Error {
  constructor(required: Scope) {
    super(
      `This connection does not include the "${required}" permission. Reconnect the Dokploy integration and grant it to continue.`
    )
    this.name = 'ScopeDeniedError'
  }
}

export function allows(context: McpContext, required: Scope): boolean {
  return hasScope(context.scopes, required)
}

export function requireScope(context: McpContext, required: Scope): void {
  if (!allows(context, required)) {
    throw new ScopeDeniedError(required)
  }
}
