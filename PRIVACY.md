# Privacy Policy

**Last updated: 3 October 2026**

This policy explains what the hosted Dokploy MCP service does with your data, and what it
deliberately does not do.

Dokploy MCP is a bridge. It stands between an AI assistant and the Dokploy panel **you** host. It
holds no account of its own, keeps no database, and is built so that the operator of the service
cannot read your credentials at rest.

## 1. Who is responsible

| | |
|---|---|
| Controller | danbenba, an individual developer established in France |
| Contact | [contact@danbenba.dev](mailto:contact@danbenba.dev) |
| Service | `dokploy.rest`, `mcp.dokploy.rest`, `docs.dokploy.rest`, `legal.dokploy.rest` |
| Source code | [github.com/danbenba/dokploy-mcp](https://github.com/danbenba/dokploy-mcp) (Apache 2.0) |

This policy covers the **hosted** service only. If you run the server yourself, from the source or
the published image, you are the controller of everything it processes, and this document is a
template you are free to adapt.

Dokploy MCP is not affiliated with Dokploy Technology, Inc., nor with Anthropic or OpenAI.

## 2. What the service processes

### 2.1 The address of your panel

The hostname you type on the sign-in screen. It is resolved and probed before anything else is
sent, so that credentials are never relayed to a host that is not a Dokploy panel.

### 2.2 Your Dokploy credentials

Your panel email, password and, when enabled, your two-factor code or backup code. They are
relayed **once**, over TLS, to the panel you named, and to no one else. They are exchanged for one
API key per organization you selected, created on your own instance. They are never written to
disk, never logged, and never kept after the exchange.

### 2.3 Your panel account and organizations

The profile your panel returns during sign-in: display name, email address, avatar URL, and the
list of organizations the account belongs to. This is shown on the consent screen so you can see
which account you are about to connect, and it is carried inside the encrypted token described in
section 3.

### 2.4 The API keys created on your instance

One scoped key per organization you granted. They are carried inside the encrypted token and used
to sign requests to your panel. They belong to your panel: you can see and delete them there at
any time.

### 2.5 Technical request data

IP address, user agent, request path and timestamp. The IP address is used in memory to rate-limit
sign-in and token requests, and appears in the server's standard output log. Nothing is aggregated,
profiled or sold.

### 2.6 OAuth client metadata

When your assistant registers itself, it sends a client name and redirect URI, which are echoed
back inside the tokens issued to it. No personal data of yours is added to it.

### 2.7 What passes through, and is not kept

When your assistant calls a tool, the arguments it sends and the response your panel returns travel
through the server in memory for the duration of that single request. Build logs, runtime logs,
environment variables and deployment history are read from your panel and handed straight to your
assistant. None of it is stored, cached or inspected.

## 3. There is no database

The service has no persistent store. Every piece of session state lives inside an encrypted JWE
token held by your assistant, not by the server. The panel URL, the API keys and the account
profile are sealed inside it, so they are not sitting in a store the operator could read at rest.

Retention is therefore the lifetime of each token:

| Artefact | Lifetime |
|---|---|
| Sign-in flow token (may briefly carry a panel session cookie) | 15 minutes |
| Authorization code | 2 minutes |
| Access token | 1 hour |
| Refresh token | 30 days, rotated on each use |
| In-memory rate-limit counters | 1 minute, and lost on restart |
| Server logs on standard output | kept by container log rotation, not forwarded anywhere |

Rotating the server's `TOKEN_SECRET` invalidates every token ever issued.

## 4. No tracking

The websites set no advertising or analytics cookies, embed no third-party tracker, no tag manager
and no advertising pixel. There is no profiling and no automated decision-making. The only browser
storage used is what your own sign-in flow needs to work.

## 5. Legal bases

Under Article 6 of the GDPR:

- **Article 6(1)(b), performance of a contract** — resolving your panel address, relaying your
  credentials once, creating the API keys you asked for, issuing tokens and serving tool calls.
  Without this the service cannot do the one thing you asked it to do.
- **Article 6(1)(f), legitimate interests** — rate limiting, abuse prevention and security logging,
  so that a public authorization server is not trivially abused. The interest is balanced by
  keeping this data minimal and short-lived.

## 6. Who else is involved

- **Your Dokploy panel.** Yours. Credentials and API calls end up there, under your own rules.
- **Your AI assistant.** Anthropic, OpenAI or whichever client you use is a separate, independent
  controller for everything you type into it, under its own privacy policy. Dokploy MCP has no
  visibility into your conversations.
- **Cloudflare, Inc.** Traffic to the websites passes through Cloudflare's network as a reverse
  proxy and TLS terminator. Cloudflare's network is global, so requests may transit points of
  presence outside the EEA; Cloudflare's data processing addendum and the EU standard contractual
  clauses apply to that transit.
- **The hosting infrastructure** the maintainer rents to run the server, located in the EEA.

Nothing is sold, rented or shared for advertising. There is no other recipient.

## 7. Your rights

You have the right to access, rectify, erase, restrict and port your data, and to object to
processing based on legitimate interests. Write to
[contact@danbenba.dev](mailto:contact@danbenba.dev).

In practice, because there is no database, you can exercise most of this yourself and immediately:

- **Revoke access** — delete the API key in your panel under *Settings → API Keys*. The connection
  stops working at once.
- **Erase** — remove the connector from your assistant. The tokens are held by the assistant, so
  they disappear with it, and they expire on their own in any case.

If you believe your rights have not been respected, you may lodge a complaint with the CNIL, the
French supervisory authority, at [cnil.fr](https://www.cnil.fr).

## 8. Security

- Panel addresses are verified before any credential is sent: DNS resolution, a guard against
  private and loopback addresses to prevent server-side request forgery, then two probes that
  confirm the host really is a Dokploy panel.
- Traffic to this service always travels over TLS. The link to **your** panel is whatever you
  gave it: a `http://` address is accepted, so that a panel without a certificate can still be
  reached, and both screens that carry a credential say plainly that it will cross the network
  unencrypted. An operator can forbid it outright with `ALLOW_INSECURE_DOKPLOY=false`.
- Tokens are encrypted, not merely signed. Authorization codes are single-use and refresh tokens
  rotate on every use.
- Permissions are enforced twice: tools outside the scopes you granted are not even listed to the
  assistant, and every handler checks again before touching your panel.
- Destructive tools require an explicit confirmation argument on top of the `delete` scope.
- PKCE with S256 is mandatory on every authorization.

No system is perfect. If you find a vulnerability, please follow
[SECURITY.md](https://github.com/danbenba/dokploy-mcp/blob/main/SECURITY.md) rather than opening a
public issue.

## 9. Children

The service is a developer tool and is not directed at children under 16.

## 10. Changes

Material changes will be reflected in the date at the top of this document and in the repository's
git history, which is public. The current version always lives at
[legal.dokploy.rest/privacy](https://legal.dokploy.rest/privacy).
