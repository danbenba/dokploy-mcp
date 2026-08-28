## What this changes

<!-- One or two sentences. What behaviour is different after this pull request? -->

## Why

<!-- The problem it solves, or the issue it closes. -->

## How it was verified

- [ ] `npm run typecheck -w apps/api`
- [ ] `npm run test -w apps/api`
- [ ] `npm run test -w apps/cli`
- [ ] Tried the change against a real or stubbed Dokploy panel

## Checklist for a new or changed tool

- [ ] Registered only when its scope was granted, and re-checks with `requireScope`
- [ ] Destructive behaviour requires an explicit confirmation argument
- [ ] The description tells a model that has never seen Dokploy what to call before and after
- [ ] Scope expectations updated in `apps/api/tests/functional/mcp_endpoint.spec.ts`

## Checklist for anything touching authorization

- [ ] Redirect URIs are still validated against the registered client
- [ ] PKCE is still mandatory and still S256
- [ ] No secret is logged, and no token is written to disk
