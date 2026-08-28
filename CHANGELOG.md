# Changelog

## Unreleased

First working version of the connector.

### Added

- OAuth 2.1 authorization server for MCP clients: RFC 8414 and RFC 9728 discovery documents, RFC
  7591 dynamic client registration, mandatory PKCE with S256, refresh tokens, and a
  `WWW-Authenticate` challenge that points Claude at the resource metadata.
- Login flow shared with the web UI: panel verification, email and password sign-in with two-factor
  and backup codes, API key sign-in, and a consent step where the user picks the permissions.
- Stateless tokens. Every code, access token and refresh token is an encrypted JWE carrying the
  panel it stands for, so the server keeps no database and no credential at rest.
- Panel verification with an SSRF guard: https only, no private or loopback addresses, and two
  probes confirming the host is really a Dokploy panel.
- MCP tool surface over Dokploy: projects, environments, applications, compose stacks, six database
  engines, domains with Let's Encrypt, deployments with build and runtime logs, docker containers
  and remote servers, mounts, published ports, redirects, basic auth, scheduled jobs and backups.
- Generic bridge over the whole Dokploy API: `api_find` searches the 554 endpoint catalog with real
  parameter schemas, `dokploy_api` calls any of them.
- Five operating playbooks loaded on demand: deploy, troubleshoot, database, template, domains.
- Permission model with five scopes. Tools outside the granted scopes are never registered, every
  handler re-checks, and destructive tools require an explicit confirmation argument.
- Web UI: landing page, login screen with a live verification animation, and a consent screen
  showing the account, the panel and the permissions being granted.
- npm package `dokploy-mcp` for stdio, so a local assistant can connect with an existing API key.
- Docker images for the server and the web UI, plus a compose file joining `dokploy-network`.
