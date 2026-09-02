import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const MetadataController = () => import('#controllers/metadata_controller')
const OauthController = () => import('#controllers/oauth_controller')
const FlowController = () => import('#controllers/flow_controller')
const McpController = () => import('#controllers/mcp_controller')
const CliController = () => import('#controllers/cli_controller')

router.get('/', [MetadataController, 'index'])
router.get('/health', [MetadataController, 'health'])

router.get('/.well-known/oauth-authorization-server', [MetadataController, 'authorizationServer'])
router.get('/.well-known/oauth-authorization-server/mcp', [
  MetadataController,
  'authorizationServer',
])
router.get('/.well-known/openid-configuration', [MetadataController, 'authorizationServer'])
router.get('/.well-known/oauth-protected-resource', [MetadataController, 'protectedResource'])
router.get('/.well-known/oauth-protected-resource/mcp', [MetadataController, 'protectedResource'])

router
  .group(() => {
    router.post('/register', [OauthController, 'register'])
    router.get('/authorize', [OauthController, 'authorize'])
    router.post('/token', [OauthController, 'token'])
    router.post('/revoke', [OauthController, 'revoke'])
  })
  .prefix('/oauth')
  .use(middleware.rateLimit())

router
  .group(() => {
    router.post('/session', [FlowController, 'session'])
    router.post('/avatar', [FlowController, 'avatar'])
    router.post('/logout', [FlowController, 'logout'])
    router.post('/verify', [FlowController, 'verify'])
    router.post('/login', [FlowController, 'login'])
    router.post('/second-factor', [FlowController, 'secondFactor'])
    router.post('/api-key', [FlowController, 'apiKey'])
    router.post('/consent', [FlowController, 'consent'])
    router.post('/deny', [FlowController, 'deny'])
  })
  .prefix('/flow')
  .use(middleware.rateLimit())

router.post('/cli/credentials', [CliController, 'credentials']).use(middleware.mcpAuth())

router.post('/mcp', [McpController, 'handle']).use(middleware.mcpAuth())
router.get('/mcp', [McpController, 'unsupported']).use(middleware.mcpAuth())
router.delete('/mcp', [McpController, 'unsupported']).use(middleware.mcpAuth())

router.post('/', [McpController, 'handle']).use(middleware.mcpAuth())
router.delete('/', [McpController, 'unsupported']).use(middleware.mcpAuth())
