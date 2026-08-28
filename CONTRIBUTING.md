# Contributing

Thanks for helping out. This project connects assistants to infrastructure people depend on, so the
bar for correctness and for clear error messages is high.

## Getting started

```bash
npm install
npm run build -w packages/core
cp apps/api/.env.example apps/api/.env
```

Fill `APP_KEY` and `TOKEN_SECRET` in `apps/api/.env`:

```bash
node -e "console.log('APP_KEY=' + require('crypto').randomBytes(24).toString('base64url'))"
node -e "console.log('TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
```

Then run the two servers:

```bash
npm run dev -w apps/api   # http://localhost:3333
npm run dev -w apps/web   # http://localhost:5173
```

`packages/core` is consumed as a built package, so re-run `npm run build -w packages/core` after
changing it, or keep `npm run dev -w packages/core` running to rebuild on save.

## Testing

```bash
npm run test -w apps/api        # japa: unit and functional
npm run test -w apps/cli        # vitest
npm run typecheck -w apps/api
```

Functional tests boot the real HTTP server, so they cover the discovery documents, the OAuth
guards, the login flow API and the MCP endpoint including scope filtering.

To exercise the whole flow without a real panel, run a stub that answers the handful of endpoints
the flow touches (`/api/health`, `/api/settings.isCloud`, `/api/auth/sign-in/email`,
`/api/auth/get-session`, `/api/organization.all`, `/api/user.createApiKey`) and set
`ALLOW_PRIVATE_NETWORKS=true` plus `ALLOW_INSECURE_DOKPLOY=true` in `apps/api/.env`. Set them back
to `false` before committing: they disable the SSRF guard.

## Regenerating the Dokploy endpoint catalog

`packages/core/src/mcp/catalog.json` is generated from Dokploy's own OpenAPI document. After a
Dokploy release, fetch the new spec from a panel:

```bash
curl -s https://panel.example.com/api/settings.getOpenApiDocument > openapi.json
```

then rebuild the catalog with the generator in `scripts/generate-catalog.mjs`:

```bash
node scripts/generate-catalog.mjs openapi.json
npm run build -w packages/core
npm run test -w apps/api
```

Never edit `catalog.json` by hand: the tests assert that required flags and enums match the spec.

## Conventions

- No comments in application code. Names and error messages carry the intent; when a rule is not
  obvious, state it in an error message the operator will actually read.
- Error messages address the operator, not the developer. Say what failed, on which host, and what
  to do next.
- Every new tool declares the scope it needs, registers only when that scope was granted, and calls
  `requireScope` again inside the handler.
- Destructive tools take an explicit confirmation argument.
- Commits are small and describe the change, not the file.

## Adding a tool

1. Put it in the matching module under `packages/core/src/mcp/tools/`.
2. Gate registration with `allows(context, scope)` and re-check with `requireScope`.
3. Write the description for a model that has never seen Dokploy: name the prerequisite, the
   asynchronous behaviour, and the tool to call next.
4. Add it to the scope expectations in `apps/api/tests/functional/mcp_endpoint.spec.ts`.

## Security reports

Do not open a public issue for a vulnerability. Email the maintainer at the address in the
repository metadata, and describe the class of problem rather than a working exploit.
