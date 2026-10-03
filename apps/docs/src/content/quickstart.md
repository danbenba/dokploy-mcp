The fastest path is the hosted connector: nothing to install, no API key to create by hand.

## 1. Add the connector

Add this URL as a custom connector in Claude, ChatGPT or any client that speaks remote MCP:

```
https://mcp.dokploy.rest
```

In Claude, that is **Settings → Connectors → Add custom connector**. In ChatGPT, it is the
connector or developer-mode panel, depending on your plan.

## 2. Sign in to your own panel

Your client sends you to [dokploy.rest](https://dokploy.rest). Enter the address of **your** Dokploy
panel, for example `https://panel.example.com`.

The address is checked before anything else is sent: it is resolved, screened against private and
loopback ranges, then probed twice to confirm the host really is a Dokploy panel. Only then is a
sign-in form shown. Two-factor codes and backup codes are both accepted.

## 3. Choose what to grant

Pick the organizations to expose and the permissions to grant. One scoped API key is created per
organization you select, on your own instance, labelled `Dokploy MCP`.

The default grant is `read`, `deploy` and `create`. Deleting and full API access are off unless you
turn them on. See [permissions](/permissions).

## 4. Slide to authorize

You land back in your assistant, connected. Ask it something:

```
List my Dokploy projects
```

```
Deploy the api service from GitHub to api.example.com
```

```
Why is the checkout service returning 502?
```

## Already have an API key?

Skip OAuth entirely and run the server next to your assistant over stdio:

```bash
claude mcp add dokploy \
  -e DOKPLOY_URL=https://panel.example.com \
  -e DOKPLOY_API_KEY=your-key \
  -- npx -y dokploy-rest
```

Or let the installer detect your assistants and write the config for you:

```bash
npx -y dokploy-rest install
```

Full details in [npm package](/npm-package) and the [CLI reference](/cli).

## Revoking access

Delete the API key in your panel under **Settings → API Keys**. The connection stops working
immediately, with nothing to clean up on our side: there is no database, and the tokens your
assistant holds expire on their own.
