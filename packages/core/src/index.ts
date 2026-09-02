export { normalizeBaseUrl } from './url.js'

export {
  DokployApiError,
  DokployAuthError,
  InstanceVerificationError,
  extractErrorMessage,
} from './dokploy/errors.js'

export { default as DokployClient, type DokployClientOptions } from './dokploy/client.js'

export {
  DokployOrgPool,
  type DokployCaller,
  type OrganizationClient,
  type OrganizationCredential,
} from './dokploy/org_pool.js'

export {
  isPrivateAddress,
  verifyDokployInstance,
  type VerifiedInstance,
  type VerifyOptions,
} from './dokploy/verifier.js'

export {
  createApiKeyWithSession,
  fetchAccountWithApiKey,
  fetchAccountWithSession,
  fetchAvatarWithApiKey,
  fetchAvatarWithSession,
  signInWithEmail,
  signOut,
  verifyBackupCode,
  verifyTotpCode,
  type CredentialSession,
  type DokployAccount,
  type DokployOrganization,
} from './dokploy/authenticator.js'

export {
  ALL_SCOPES,
  DEFAULT_SCOPES,
  SCOPE_DEFINITIONS,
  describeScopes,
  formatScopeParam,
  hasScope,
  isScope,
  parseScopeParam,
  sanitizeScopes,
  type Scope,
  type ScopeDefinition,
} from './scopes.js'

export {
  catalogCount,
  catalogVersion,
  describeEndpoint,
  findEndpoints,
  type CatalogEntry,
  type CatalogHit,
  type CatalogParam,
} from './mcp/catalog.js'

export {
  DB_ROUTERS,
  DEFAULT_DB_IMAGES,
  INTERNAL_PORTS,
  SERVICE_ROUTERS,
  compact,
  pick,
  resolveService,
  summarizeEnvironment,
  summarizeProject,
  textResult,
} from './mcp/helpers.js'

export {
  ScopeDeniedError,
  allows,
  requireScope,
  type McpContext,
  type ToolModule,
} from './mcp/context.js'

export { PLAYBOOKS, PLAYBOOK_NAMES, type PlaybookName } from './mcp/playbooks.js'

export {
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  SERVER_VERSION,
  createMcpServer,
} from './mcp/server.js'
