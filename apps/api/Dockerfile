# Multi-stage build for the API. Built from the monorepo root (see docker-compose.yml).
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS build
ARG DATABASE_URL=postgresql://admin:admin@localhost:5432/admin_panel?schema=public
ENV DATABASE_URL=${DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
RUN pnpm --filter @admin/shared build
RUN pnpm --filter @admin/api db:generate
RUN pnpm --filter @admin/api build
# tsc only compiles .ts -> dist; the generated Prisma client's native query engine
# binary lives alongside it in src/generated/prisma and must be copied by hand.
RUN cp apps/api/src/generated/prisma/*.node apps/api/dist/generated/prisma/

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
