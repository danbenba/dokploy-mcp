The hosted connector runs at `https://mcp.dokploy.rest`. You paste one URL into your assistant and
never handle an API key yourself.

## Adding it

```
https://mcp.dokploy.rest
```

The server is a full OAuth 2.1 authorization server, so a compliant client discovers everything it
needs from that one URL: the metadata documents, the registration endpoint and the PKCE
requirements. No client id or secret to configure.

| Client | Where |
|---|---|
| Claude | Settings → Connectors → Add custom connector |
| ChatGPT | Connectors, or developer mode, depending on the plan |
| Cursor, VS Code | One-click links on [dokploy.rest](https://dokploy.rest) |
| Anything else | Wherever the client takes a remote MCP URL |

## What happens when you connect

1. Your client registers itself dynamically and opens the authorization URL.
2. You are redirected to [dokploy.rest](https://dokploy.rest) and asked for the address of your
   panel.
3. The address is resolved and probed. A host that is not a Dokploy panel is refused before a
   password is ever requested.
4. You sign in. Credentials are relayed once to the panel you named, over TLS, and are not stored.
5. You choose organizations and permissions. One API key per selected organization is created on
   your instance, labelled `Dokploy MCP`.
6. You slide to authorize, and your client exchanges the code for tokens.

The mechanics, down to the RFCs involved, are in [authorization flow](/authorization).

## What the service knows about you

Nothing that outlives your tokens. There is no database. The panel URL, the API keys and your
account profile are sealed inside an encrypted JWE token held by your assistant, not by the server:

| Artefact | Lifetime |
|---|---|
| Sign-in flow token | 15 minutes |
| Authorization code | 2 minutes, single use |
| Access token | 1 hour |
| Refresh token | 30 days, rotated on each use |

The full account of what is processed is the
[privacy policy](https://legal.dokploy.rest/privacy).

## Several organizations

A Dokploy API key belongs to one organization. The consent screen lists every organization the
account belongs to, all preselected, with the active one badged. Select several and one key is
created for each.

From then on, `dokploy_status` reports the organizations that were recognised, `list_projects`
covers all of them and tags each project with its owner, `create_project` accepts an
`organization_id`, and every other tool finds the organization that owns the resource it is given.

## When to use something else

The hosted connector is the right default. Reach for another mode when:

- your panel is not reachable from the public internet, or sits behind a VPN — use the
  [npm package](/npm-package), which runs on your machine;
- policy requires that no third party ever relays a credential — [self-host](/self-hosting) the
  same server;
- you want the connector locked to a single panel for your whole team — self-host with
  `DOKPLOY_LOCKED_URL`.
