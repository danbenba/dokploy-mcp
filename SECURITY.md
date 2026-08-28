# Security policy

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting on this repository, or
email the maintainer listed in the repository metadata.

Describe the class of problem, the impact, and the smallest reproduction you can. Please do not
include a working exploit chain or credentials belonging to a real panel.

You will get an acknowledgement within a few days. Fixes for anything that lets one user reach
another user's panel, or that leaks an API key, take priority over everything else.

## Scope

In scope:

- the OAuth authorization server: discovery, registration, authorize, token, the login flow API
- token confidentiality and integrity, PKCE handling, redirect URI validation
- the SSRF guard around panel verification
- scope enforcement in the MCP tool surface
- the published `dokploy-mcp` npm package

Out of scope:

- vulnerabilities in Dokploy itself, which belong to https://github.com/dokploy/dokploy
- findings that require an operator to deliberately set `ALLOW_PRIVATE_NETWORKS=true` or
  `ALLOW_INSECURE_DOKPLOY=true`, which exist for local development and are documented as unsafe
- rate limiting on a self-hosted instance the reporter controls

## Design notes for reviewers

- The server keeps no database. Tokens are encrypted JWEs, so an access token carries the panel URL
  and API key it stands for, and only the holder of `TOKEN_SECRET` can read them. Rotating that
  secret invalidates every issued token.
- Client registration is stateless too: a `client_id` is a signed document listing the redirect
  URIs, verified on every authorize and token request.
- A panel address is verified before any credential leaves the browser: it must be https, must not
  resolve to a private or loopback address, must answer the Dokploy health endpoint, and must
  answer `settings.isCloud` with a boolean.
- Passwords are relayed once to the panel the user named, exchanged for an API key through that
  panel's own endpoint, and never persisted.
- Granted scopes are enforced twice: tools outside them are never registered, and each handler
  re-checks before calling the API.

## Operating an instance safely

- Set a long random `TOKEN_SECRET` and keep it out of version control.
- Terminate TLS in front of the server and leave `TRUST_PROXY` on so client addresses are correct.
- Keep `ALLOW_PRIVATE_NETWORKS` and `ALLOW_INSECURE_DOKPLOY` false in production.
- Consider `DOKPLOY_LOCKED_URL` when the deployment serves a single known panel.
