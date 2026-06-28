DC := docker-compose

.PHONY: up down ps shell up-db down-db
.PHONY: logs logs-api logs-web logs-db
.PHONY: build rebuild build-api rebuild-api build-web rebuild-web build-all rebuild-all
.PHONY: migrate migrate-deploy seed reset studio
.PHONY: dev dev-api dev-web
.PHONY: lint typecheck type-check typecheck-local test

up:
	$(DC) up -d

down:
	$(DC) down

up-db:
	$(DC) up -d postgres

down-db:
	$(DC) stop postgres

ps:
	$(DC) ps

logs:
	$(DC) logs

logs-api:
	$(DC) logs -f api

logs-web:
	$(DC) logs -f web

logs-db:
	$(DC) logs -f postgres

shell:
	$(DC) exec api sh

build:
	$(DC) build

rebuild:
	$(DC) up -d --build

build-api:
	$(DC) build api

rebuild-api:
	$(DC) up -d --build api

build-web:
	$(DC) build web

rebuild-web:
	$(DC) up -d --build web

build-all:
	$(DC) build

rebuild-all:
	$(DC) up -d --build

# Local hot-reload workflow (keep only Postgres in Docker).
dev:
	pnpm dev

dev-api:
	pnpm --filter @admin/api dev

dev-web:
	pnpm --filter @admin/web dev

migrate:
	$(DC) exec api pnpm db:migrate

migrate-deploy:
	$(DC) exec api pnpm db:deploy

seed:
	$(DC) exec api pnpm db:seed

reset:
	$(DC) exec api sh -lc "pnpm prisma migrate reset --force"

# Run Prisma Studio from host workspace for easier browser access.
studio:
# 	pnpm --filter @admin/api db:studio
	$(DC) exec api sh -lc "pnpm prisma studio"

lint:
	pnpm lint

typecheck:
	$(DC) exec api pnpm typecheck

typecheck-local:
	pnpm --filter @admin/api typecheck

test:
	pnpm test

# Backward-compatible alias.
type-check: typecheck
