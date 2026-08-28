export class DokployApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string, message: string) {
    super(message);
    this.name = "DokployApiError";
    this.status = status;
    this.path = path;
  }
}

export interface DokployClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export function extractErrorMessage(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    if (data && typeof data === "object") {
      const issues = Array.isArray(data.issues)
        ? (data.issues as Array<{ path?: unknown[]; message?: string }>)
            .slice(0, 5)
            .map((issue) => {
              const loc = Array.isArray(issue.path) ? issue.path.join(".") : "";
              return loc ? `${loc}: ${issue.message ?? "?"}` : (issue.message ?? "?");
            })
            .join("; ")
        : "";
      const message = String(data.message ?? data.error ?? "");
      const combined = [message, issues].filter(Boolean).join(" — ");
      if (combined) return combined;
    }
  } catch {
    void 0;
  }
  return body.slice(0, 300) || `HTTP ${status}`;
}

export class DokployClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: DokployClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  get instanceUrl(): string {
    return this.baseUrl;
  }

  async call(path: string, method: "GET" | "POST", params?: Record<string, unknown>): Promise<unknown> {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}/api${cleanPath}`);
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      accept: "application/json",
    };
    const init: RequestInit = { method, headers, signal: AbortSignal.timeout(this.timeoutMs) };
    if (method === "GET") {
      for (const [key, value] of Object.entries(params ?? {})) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    } else {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(params ?? {});
    }
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new DokployApiError(0, cleanPath, `cannot reach Dokploy at ${this.baseUrl}: ${reason}`);
    }
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new DokployApiError(
        response.status,
        cleanPath,
        "Dokploy rejected the API key. It may have been revoked — reconnect the integration to re-authenticate.",
      );
    }
    if (!response.ok) {
      throw new DokployApiError(response.status, cleanPath, extractErrorMessage(response.status, text));
    }
    if (!text) return { ok: true };
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async get(path: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.call(path, "GET", params);
  }

  async post(path: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.call(path, "POST", params);
  }
}
