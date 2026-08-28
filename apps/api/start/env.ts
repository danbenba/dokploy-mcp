import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  PUBLIC_URL: Env.schema.string.optional(),
  WEB_URL: Env.schema.string.optional(),
  TOKEN_SECRET: Env.schema.string.optional(),

  ACCESS_TOKEN_TTL: Env.schema.number.optional(),
  REFRESH_TOKEN_TTL: Env.schema.number.optional(),
  AUTH_CODE_TTL: Env.schema.number.optional(),
  FLOW_SESSION_TTL: Env.schema.number.optional(),

  DOKPLOY_LOCKED_URL: Env.schema.string.optional(),
  ALLOW_PRIVATE_NETWORKS: Env.schema.boolean.optional(),
  ALLOW_INSECURE_DOKPLOY: Env.schema.boolean.optional(),
  BRAND_NAME: Env.schema.string.optional(),
  API_KEY_LABEL: Env.schema.string.optional(),
})
