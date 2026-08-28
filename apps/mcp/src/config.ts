import { randomBytes } from "node:crypto";

export interface ServerConfig {
  port: number;
  host: string;
  publicUrl: string;
  webUrl: string;
  jwtSecret: string;
  jwtSecretGenerated: boolean;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  authCodeTtl: number;
  flowSessionTtl: number;
  lockedDokployUrl: string | null;
  allowPrivateNetworks: boolean;
  allowInsecureDokploy: boolean;
  brandName: string;
  trustProxy: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  supportedScopes: string[];
}

export interface StdioConfig {
  dokployUrl: string;
  dokployApiKey: string;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

function envInt(name: string, fallback: number): number {
  const raw = env(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return parsed;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = env(name);
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  parsed.username = "";
  parsed.password = "";
  let pathname = parsed.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/api")) pathname = pathname.slice(0, -4);
  parsed.pathname = pathname;
  return parsed.toString().replace(/\/+$/, "");
}

export function loadServerConfig(): ServerConfig {
  const port = envInt("PORT", 3010);
  const publicUrl = (env("PUBLIC_URL") ?? `http://localhost:${port}`).replace(/\/+$/, "");
  const webUrl = (env("WEB_URL") ?? publicUrl).replace(/\/+$/, "");
  let jwtSecret = env("JWT_SECRET");
  let jwtSecretGenerated = false;
  if (!jwtSecret) {
    jwtSecret = randomBytes(48).toString("base64url");
    jwtSecretGenerated = true;
  }
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  const locked = env("DOKPLOY_LOCKED_URL");
  return {
    port,
    host: env("HOST") ?? "0.0.0.0",
    publicUrl,
    webUrl,
    jwtSecret,
    jwtSecretGenerated,
    accessTokenTtl: envInt("ACCESS_TOKEN_TTL", 3600),
    refreshTokenTtl: envInt("REFRESH_TOKEN_TTL", 60 * 60 * 24 * 30),
    authCodeTtl: envInt("AUTH_CODE_TTL", 120),
    flowSessionTtl: envInt("FLOW_SESSION_TTL", 600),
    lockedDokployUrl: locked ? normalizeBaseUrl(locked) : null,
    allowPrivateNetworks: envBool("ALLOW_PRIVATE_NETWORKS", false),
    allowInsecureDokploy: envBool("ALLOW_INSECURE_DOKPLOY", false),
    brandName: env("BRAND_NAME") ?? "Dokploy MCP",
    trustProxy: envBool("TRUST_PROXY", true),
    rateLimitWindowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000),
    rateLimitMax: envInt("RATE_LIMIT_MAX", 60),
    supportedScopes: ["read", "deploy", "create", "delete", "admin"],
  };
}

export function loadStdioConfig(): StdioConfig {
  const url = env("DOKPLOY_URL");
  const key = env("DOKPLOY_API_KEY");
  if (!url || !key) {
    throw new Error(
      "stdio mode requires DOKPLOY_URL and DOKPLOY_API_KEY environment variables. " +
        "Generate an API key in Dokploy under Settings > API Keys, " +
        "or run `dokploy-mcp serve` for the OAuth server mode.",
    );
  }
  return { dokployUrl: normalizeBaseUrl(url), dokployApiKey: key };
}
