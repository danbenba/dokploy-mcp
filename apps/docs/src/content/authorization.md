The hosted connector is a full OAuth 2.1 authorization server. A compliant MCP client discovers
everything from one URL, with no client id to configure and no secret to store.

## The flow

```
Claude                 mcp.dokploy.rest              dokploy.rest              your panel
  │                          │                            │                        │
  │─ POST /oauth/register ──▶│                            │                        │
  │─ GET  /oauth/authorize ─▶│─ redirect /login?flow=… ──▶│                        │
  │                          │◀─ POST /flow/verify ───────│─ GET /api/health ─────▶│
  │                          │◀─ POST /flow/login ────────│─ sign-in ─────────────▶│
  │                          │◀─ POST /flow/consent ──────│─ one key per org ─────▶│
  │◀── redirect ?code=… ─────│                            │                        │
  │─ POST /oauth/token ─────▶│                            │                        │
  │─ POST /mcp (Bearer) ────▶│──────── x-api-key ─────────────────────────────────▶│
```

Three parties, in this order: your client, the connector, and the panel you own. The connector never
becomes a party to your panel's data — it only holds the key long enough to sign a request, inside a
token your own client keeps.

## What the server implements

| | |
|---|---|
| Authorization server metadata | RFC 8414, at `/.well-known/oauth-authorization-server` |
| Protected resource metadata | RFC 9728, at `/.well-known/oauth-protected-resource` |
| Dynamic client registration | RFC 7591, at `/register` |
| PKCE | Mandatory, `S256` only |
| Challenge | `WWW-Authenticate` carrying the resource metadata URL |
| MCP transport | Streamable HTTP at `/mcp`, stateless, POST |

The `WWW-Authenticate` challenge is what makes the single-URL setup work: an unauthenticated call
to `/mcp` answers with the resource metadata URL, the client follows it to the authorization server
metadata, and registers itself. Nothing is configured by hand.

An OpenID-style `/.well-known/openid-configuration` document is served too, for clients that look
there first.

## Tokens carry the connection

There is no database. Every token is an encrypted JWE that carries the connection it stands for: the
panel URL, the account profile and one API key per granted organization, sealed inside.

This is the design decision the whole service rests on. The panel URL and its keys never sit in a
store the operator can read at rest, and losing the server loses nothing but uptime.

| Token | Lifetime | Notes |
|---|---|---|
| Flow | 15 minutes | The sign-in in progress. May briefly carry a panel session cookie between the login and consent steps |
| Code | 2 minutes | Single use. Replaying it fails |
| Access | 1 hour | Carries the granted scopes |
| Refresh | 30 days | Rotated on every use: the old one stops working |

Those are the hosted values. A self-hosted deployment sets its own, see
[self-hosting](/self-hosting).

Rotating `TOKEN_SECRET` invalidates every token ever issued, which is the emergency stop.

## The sign-in steps

The login UI talks to the connector, not to your panel, and the connector relays:

| Endpoint | What it does |
|---|---|
| `POST /flow/verify` | Resolve and probe the address you typed. Refuses a host that is not a Dokploy panel |
| `POST /flow/login` | Relay your credentials once to that panel |
| `POST /flow/second-factor` | TOTP code or backup code, when the account has 2FA |
| `POST /flow/avatar` | Fetch the account avatar for the consent screen |
| `POST /flow/api-key` | Create one scoped key per selected organization |
| `POST /flow/consent` | Seal the grant into an authorization code |
| `POST /flow/deny` | Abandon the flow |
| `POST /flow/logout` | Drop the panel session |

Sign-in and token endpoints are rate limited per IP, in memory.

## Revocation

`POST /revoke` accepts a token and stops it being accepted. But the revocation that actually
matters is on your side: delete the API key in your panel under **Settings → API Keys**. The key is
the only thing that grants access to your instance, and it lives on your instance.

## CLI sign-in

The `install` command uses the same server with a loopback redirect: it opens your browser, you sign
in and consent exactly as a remote client would, and `POST /cli/credentials` returns the key so the
command can write your assistant configs. The flow link is consumed the moment consent is granted or
denied.
