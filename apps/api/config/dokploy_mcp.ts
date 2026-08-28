import env from '#start/env'
import { normalizeBaseUrl } from '@dokploy-mcp/core'

export { normalizeBaseUrl } from '@dokploy-mcp/core'

const publicUrl = (env.get('PUBLIC_URL') ?? `http://localhost:${env.get('PORT')}`).replace(/\/+$/, '')
const webUrl = (env.get('WEB_URL') ?? publicUrl).replace(/\/+$/, '')
const lockedUrl = env.get('DOKPLOY_LOCKED_URL')

const dokployMcpConfig = {
  publicUrl,
  webUrl,
  tokenSecret: env.get('TOKEN_SECRET') ?? env.get('APP_KEY'),
  accessTokenTtl: env.get('ACCESS_TOKEN_TTL', 3600),
  refreshTokenTtl: env.get('REFRESH_TOKEN_TTL', 2_592_000),
  authCodeTtl: env.get('AUTH_CODE_TTL', 120),
  flowSessionTtl: env.get('FLOW_SESSION_TTL', 900),
  lockedDokployUrl: lockedUrl ? normalizeBaseUrl(lockedUrl) : null,
  allowPrivateNetworks: env.get('ALLOW_PRIVATE_NETWORKS', false),
  allowInsecureDokploy: env.get('ALLOW_INSECURE_DOKPLOY', false),
  brandName: env.get('BRAND_NAME', 'Dokploy MCP'),
  apiKeyLabel: env.get('API_KEY_LABEL', 'Dokploy MCP'),
  resourceUrl: `${publicUrl}/mcp`,
}

export default dokployMcpConfig
