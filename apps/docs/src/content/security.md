The service holds credentials to infrastructure, so the design starts from what it refuses to do.

## Your panel address is verified first

Before a password is requested, let alone relayed, the address you typed is checked:

1. **DNS resolution.** A name that does not resolve is rejected.
2. **Public-address guard.** The resolved addresses are screened against private, loopback and
   link-local ranges. This is the SSRF guard: without it, the sign-in form is a request proxy into
   whatever network the server sits in.
3. **Two probes.** The host is asked to prove it is a Dokploy panel. One that does not answer like
   one is refused.

Only then is a sign-in form shown. A self-hosted deployment can disable the private-address guard
with `ALLOW_PRIVATE_NETWORKS`, which exists for local development and should stay `false` anywhere
a stranger can reach the form.

A `http://` address is accepted, because plenty of self-hosted panels have no certificate. What it
costs is stated where it matters rather than hidden: the address step and the credentials step both
warn that everything relayed to that panel crosses the network in clear, and suggest an API key
over a password. Set `ALLOW_INSECURE_DOKPLOY=false` to refuse such panels outright. An address
typed without a scheme is still tried over https first, and only falls back to http when nothing
answers, so a working https panel is never downgraded.

## Credentials are relayed once

Your panel email, password and second factor go to the panel **you named**, over TLS, once. They
are exchanged for one API key per organization you selected, created on your own instance, and are
never written to disk and never logged.

From that moment the connection is an API key. The password is not kept, so it cannot be leaked
later by a server that never had it.

## There is no database

Every piece of session state lives inside an encrypted JWE token held by your client. The panel
URL, the account profile and the API keys are sealed inside it.

The consequence worth stating plainly: there is no store of panel credentials for an operator to
read, a backup to leak, or an attacker to dump. Compromising the running server gets you the
traffic passing through it at that moment, not a history of everyone's keys.

Tokens are **encrypted**, not merely signed, so their contents are not readable by whoever holds
them either.

## Permissions are enforced twice

Tools outside the granted scopes are not registered on the MCP server, so the assistant's tool list
genuinely does not contain them. Every handler then re-checks its scope before touching the API, so
a replayed call or a narrowed token is refused at the door.

`delete_project` and `delete_service` additionally require `confirm: true`, so destroying a project
cannot happen as a side effect of an ambiguous request. See [permissions](/permissions).

## OAuth hardening

- PKCE with `S256` is mandatory. There is no plain-text challenge path.
- Authorization codes are single use, valid two minutes.
- Refresh tokens rotate on every use: the previous one stops working.
- Sign-in and token endpoints are rate limited per IP.
- A flow link is consumed as soon as consent is granted or denied, so it cannot be replayed.
- An empty consent selection is not silently upgraded to the default scopes.
- The real client IP is resolved behind Traefik and Cloudflare, so rate limiting is not trivially
  bypassed by a forged header.

## Revoking takes one click

Delete the API key in your panel under **Settings → API Keys**. That key is the only thing granting
access to your instance, and it lives on your instance, so removing it ends the connection
immediately, regardless of what any token still says.

Rotating the server's `TOKEN_SECRET` invalidates every token ever issued at once.

## What is still on you

- **Your assistant holds the tokens.** Anthropic, OpenAI or whichever client you use is a separate
  party with its own policies. Treat the connection as you would any credential you paste into it.
- **Scopes are a ceiling, not a review.** Granting `admin` genuinely allows any API call. Grant the
  smallest set that does the job.
- **Logs can be revealing.** `service_logs` and `deployment_logs` return whatever your application
  printed, and your application may print more than you remember. The assistant sees what you ask
  it to fetch.
- **Self-hosting makes you the operator.** The guards default to safe, and the two escape hatches
  exist for a reason. Read [self-hosting](/self-hosting) before turning them off.

## Reporting a vulnerability

Follow
[SECURITY.md](https://github.com/danbenba/dokploy-mcp/blob/main/SECURITY.md)
rather than opening a public issue.

No system is perfect, and this one is maintained by one person in the open. The code is Apache 2.0
and the whole history is public, so you do not have to take any of the above on trust.
