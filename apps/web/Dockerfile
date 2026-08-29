FROM node:22-alpine AS build
WORKDIR /app
ENV npm_config_update_notifier=false

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/
RUN npm ci

COPY apps/web apps/web
ARG VITE_MCP_URL=https://mcp.dokploy.rest
ENV VITE_MCP_URL=$VITE_MCP_URL
RUN npm run build -w apps/web

FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
