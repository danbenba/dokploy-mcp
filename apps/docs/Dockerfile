FROM node:22-alpine AS build
WORKDIR /app
ENV npm_config_update_notifier=false

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/
COPY apps/docs/package.json apps/docs/
COPY apps/legal/package.json apps/legal/
RUN npm ci

# The docs site imports the landing page's components, tokens and fonts directly, so apps/web is
# part of its build context, not a duplicated copy of its design system.
COPY apps/web apps/web
COPY apps/docs apps/docs
ARG VITE_MCP_URL=https://mcp.dokploy.rest
ENV VITE_MCP_URL=$VITE_MCP_URL
RUN npm run build -w apps/docs

FROM nginx:alpine AS runtime
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/docs/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
