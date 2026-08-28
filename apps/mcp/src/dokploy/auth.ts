import { extractErrorMessage } from "./client.js";

export class DokployAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DokployAuthError";
    this.code = code;
  }
}

export interface DokployAccount {
  name: string;
  email: string;
  image: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export interface CredentialSession {
  cookies: string;
  twoFactorPending: boolean;
}

const TIMEOUT_MS = 15_000;

function mergeCookies(existing: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  const feed = (cookie: string) => {
    const pair = cookie.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  };
  for (const pair of existing.split("; ")) {
    if (pair.includes("=")) feed(pair);
  }
  for (const cookie of setCookies) feed(cookie);
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function authFetch(
  baseUrl: string,
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; cookies?: string },
): Promise<{ response: Response; cookies: string; text: string }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.cookies) headers.cookie = options.cookies;
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new DokployAuthError("unreachable", `Could not reach the Dokploy panel at ${baseUrl}.`);
  }
  const text = await response.text();
  const cookies = mergeCookies(options.cookies ?? "", response.headers.getSetCookie());
  return { response, cookies, text };
}

export async function signInWithEmail(
  baseUrl: string,
  email: string,
  password: string,
): Promise<CredentialSession> {
  const { response, cookies, text } = await authFetch(baseUrl, "/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
  });
  if (!response.ok) {
    const message = extractErrorMessage(response.status, text);
    if (response.status === 401 || /invalid|credential|password/i.test(message)) {
      throw new DokployAuthError("invalid_credentials", "Invalid email or password.");
    }
    if (/verified/i.test(message)) {
      throw new DokployAuthError("email_not_verified", "This email is not verified on the Dokploy panel.");
    }
    throw new DokployAuthError("sign_in_failed", message);
  }
  let twoFactorPending = false;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    twoFactorPending = data.twoFactorRedirect === true;
  } catch {
    void 0;
  }
  if (!twoFactorPending && !cookies) {
    throw new DokployAuthError("sign_in_failed", "The panel accepted the login but returned no session.");
  }
  return { cookies, twoFactorPending };
}

export async function verifyTotp(baseUrl: string, cookies: string, code: string): Promise<CredentialSession> {
  const { response, cookies: nextCookies, text } = await authFetch(baseUrl, "/api/auth/two-factor/verify-totp", {
    method: "POST",
    body: { code },
    cookies,
  });
  if (!response.ok) {
    throw new DokployAuthError("invalid_totp", extractErrorMessage(response.status, text) || "Invalid 2FA code.");
  }
  return { cookies: nextCookies, twoFactorPending: false };
}

function pickOrganization(data: unknown): { id: string | null; name: string | null } {
  if (!Array.isArray(data) || data.length === 0) return { id: null, name: null };
  const first = data[0] as Record<string, unknown>;
  const id = (first.organizationId ?? first.id) as string | undefined;
  const name = first.name as string | undefined;
  return { id: id ?? null, name: name ?? null };
}

export async function fetchAccountWithSession(baseUrl: string, cookies: string): Promise<DokployAccount> {
  const session = await authFetch(baseUrl, "/api/auth/get-session", { cookies });
  if (!session.response.ok) {
    throw new DokployAuthError("session_invalid", "The Dokploy session is no longer valid.");
  }
  let user: Record<string, unknown> = {};
  try {
    const data = JSON.parse(session.text) as { user?: Record<string, unknown> };
    user = data.user ?? {};
  } catch {
    void 0;
  }
  const orgs = await authFetch(baseUrl, "/api/organization.all", { cookies });
  let organization = { id: null as string | null, name: null as string | null };
  if (orgs.response.ok) {
    try {
      organization = pickOrganization(JSON.parse(orgs.text));
    } catch {
      void 0;
    }
  }
  return {
    name: String(user.name ?? user.email ?? "Dokploy user"),
    email: String(user.email ?? ""),
    image: typeof user.image === "string" ? user.image : null,
    organizationId: organization.id,
    organizationName: organization.name,
  };
}

export async function createApiKeyWithSession(
  baseUrl: string,
  cookies: string,
  keyName: string,
  organizationId: string | null,
): Promise<string> {
  const body: Record<string, unknown> = { name: keyName.slice(0, 32) };
  if (organizationId) body.metadata = { organizationId };
  const { response, text } = await authFetch(baseUrl, "/api/user.createApiKey", {
    method: "POST",
    body,
    cookies,
  });
  if (!response.ok) {
    throw new DokployAuthError(
      "api_key_creation_failed",
      `The panel refused to create an API key: ${extractErrorMessage(response.status, text)}`,
    );
  }
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const key = data.key ?? data.apiKey ?? null;
    if (typeof key === "string" && key.length > 0) return key;
  } catch {
    void 0;
  }
  throw new DokployAuthError("api_key_creation_failed", "The panel created the key but did not return it.");
}

export async function fetchAccountWithApiKey(baseUrl: string, apiKey: string): Promise<DokployAccount> {
  let response: Response;
  let text: string;
  try {
    response = await fetch(`${baseUrl}/api/user.get`, {
      headers: { "x-api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    text = await response.text();
  } catch {
    throw new DokployAuthError("unreachable", `Could not reach the Dokploy panel at ${baseUrl}.`);
  }
  if (response.status === 401 || response.status === 403) {
    throw new DokployAuthError("invalid_api_key", "This API key was rejected by the Dokploy panel.");
  }
  if (!response.ok) {
    throw new DokployAuthError("invalid_api_key", extractErrorMessage(response.status, text));
  }
  let user: Record<string, unknown> = {};
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    user = (data.user as Record<string, unknown>) ?? data;
  } catch {
    void 0;
  }
  return {
    name: String(user.name ?? user.email ?? "Dokploy user"),
    email: String(user.email ?? ""),
    image: typeof user.image === "string" ? user.image : null,
    organizationId: null,
    organizationName: null,
  };
}
