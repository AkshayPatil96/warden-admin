DC := docker-compose

.PHONY: up down ps shell
.PHONY: logs logs-api logs-web
.PHONY: build rebuild build-api rebuild-api build-web rebuild-web build-all rebuild-all
.PHONY: migrate migrate-deploy seed reset studio
.PHONY: dev dev-api dev-web
.PHONY: lint typecheck type-check typecheck-local test

up:
	$(DC) up -d

down:
	$(DC) down

ps:
	$(DC) ps

logs:
	$(DC) logs

logs-api:
	$(DC) logs -f api

logs-web:
	$(DC) logs -f web

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

# Local hot-reload workflow.
dev:
	pnpm dev

dev-api:
	pnpm --filter @admin/api dev

dev-web:
	pnpm --filter @admin/web dev

migrate:
	pnpm --filter @admin/api db:migrate

generate:
	pnpm --filter @admin/api db:generate

migrate-deploy:
	pnpm --filter @admin/api db:deploy

seed:
	pnpm --filter @admin/api db:seed

reset:
	pnpm --filter @admin/api db:reset

# Run Prisma Studio from host workspace for easier browser access.
studio:
	pnpm --filter @admin/api db:studio

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
