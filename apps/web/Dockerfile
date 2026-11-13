# Store (Next.js server). Build from the repository root:  docker build -f apps/web/Dockerfile -t nobar-web .
# NEXT_PUBLIC_* values are fixed at build time. The defaults suit one domain serving the store at "/",
# the panels at /seller and /admin, and the API at /v1 (infra/compose).
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
ARG NEXT_PUBLIC_API_URL=/
ARG NEXT_PUBLIC_SELLER_URL=/seller/
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SELLER_URL=$NEXT_PUBLIC_SELLER_URL NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm install --frozen-lockfile --filter @nobar/web... \
 && pnpm --filter @nobar/web build

FROM node:22-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# the runtime only needs node: drop the package managers the base image ships (and their advisories)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/manifest.webmanifest >/dev/null || exit 1
# API_INTERNAL_URL (e.g. http://api:4000) lets product pages read their title and description on the server
CMD ["node", "apps/web/server.js"]
