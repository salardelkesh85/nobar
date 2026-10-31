# Build from the repository root:  docker build -f apps/api/Dockerfile -t nobar-api .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @nobar/api... \
 && pnpm --filter @nobar/api build \
 && pnpm --filter @nobar/api deploy --prod --legacy /out \
 && cp -r apps/api/dist /out/dist

FROM node:22-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/healthz || exit 1
CMD ["node", "--enable-source-maps", "dist/main.js"]
