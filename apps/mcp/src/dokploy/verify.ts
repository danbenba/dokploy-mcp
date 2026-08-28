import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { normalizeBaseUrl } from "../config.js";

export class VerificationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VerificationError";
    this.code = code;
  }
}

export interface VerifiedInstance {
  url: string;
  host: string;
  isCloud: boolean;
}

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return PRIVATE_V4.some((re) => re.test(address));
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return false;
  }
  return false;
}

async function assertPublicHost(host: string, allowPrivate: boolean): Promise<void> {
  if (allowPrivate) return;
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new VerificationError(
        "private_address",
        "This address points to a private network. The public connector only reaches Dokploy panels on public addresses.",
      );
    }
    return;
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new VerificationError("private_address", "Local hostnames cannot be reached by the public connector.");
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new VerificationError("dns", `Could not resolve ${host}. Check the URL and your DNS records.`);
  }
  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new VerificationError(
      "private_address",
      `${host} resolves to a private address. The public connector only reaches public Dokploy panels.`,
    );
  }
}

async function probe(url: string, timeoutMs: number): Promise<Response> {
  return fetch(url, {
    headers: { accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export interface VerifyOptions {
  allowPrivateNetworks?: boolean;
  allowInsecure?: boolean;
  timeoutMs?: number;
}

export async function verifyDokployInstance(input: string, options: VerifyOptions = {}): Promise<VerifiedInstance> {
  let url: string;
  try {
    url = normalizeBaseUrl(input);
  } catch {
    throw new VerificationError("invalid_url", "This does not look like a valid URL.");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !options.allowInsecure) {
    throw new VerificationError("insecure", "Only https:// Dokploy panels are allowed.");
  }
  await assertPublicHost(parsed.hostname, options.allowPrivateNetworks ?? false);

  const timeoutMs = options.timeoutMs ?? 10_000;
  let health: Response;
  try {
    health = await probe(`${url}/api/health`, timeoutMs);
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "connection timed out" : "connection failed";
    throw new VerificationError("unreachable", `Could not reach ${parsed.hostname}: ${reason}.`);
  }
  if (!health.ok) {
    throw new VerificationError(
      "not_dokploy",
      `${parsed.hostname} answered but does not expose the Dokploy health endpoint (HTTP ${health.status}).`,
    );
  }

  let isCloud = false;
  try {
    const response = await probe(`${url}/api/settings.isCloud`, timeoutMs);
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const body = (await response.json()) as unknown;
    if (typeof body !== "boolean") {
      throw new Error("unexpected body");
    }
    isCloud = body;
  } catch {
    throw new VerificationError(
      "not_dokploy",
      `${parsed.hostname} does not answer like a Dokploy panel. Check that the URL points to the panel itself.`,
    );
  }

  return { url, host: parsed.hostname, isCloud };
}
