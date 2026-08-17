.PHONY: install dev dev-local lint typecheck api-test web-smoke validate docker-config docker-up docker-down

install:
	pnpm install

dev:
	pnpm dev

dev-local:
	pnpm dev:local

lint:
	pnpm lint

typecheck:
	pnpm typecheck

api-test:
	cd apps/api && python -m pytest

web-smoke:
	node scripts/frontend_smoke.mjs

validate: lint typecheck api-test web-smoke docker-config

docker-config:
	docker compose -f infra/docker-compose.yml config

docker-up:
	docker compose -f infra/docker-compose.yml up --build

docker-down:
	docker compose -f infra/docker-compose.yml down
