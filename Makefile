.PHONY: up down build logs dev dev-backend dev-frontend clean help

# ── Docker Compose ─────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Start the platform (docker compose)
	docker compose up -d --build

down: ## Stop the platform
	docker compose down

build: ## Rebuild containers without starting
	docker compose build

logs: ## Tail all container logs
	docker compose logs -f

restart: ## Restart all services
	docker compose restart

status: ## Show running containers
	docker compose ps

# ── Local development ──────────────────────────────────────────────────
dev: dev-backend dev-frontend ## Start both backend and frontend for local dev

dev-backend: ## Start FastAPI dev server on :8000
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start Vite dev server on :3000
	cd frontend && npm run dev

install: ## Install all dependencies
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# ── Utilities ──────────────────────────────────────────────────────────
clean: ## Remove build artifacts and data
	rm -rf frontend/dist frontend/node_modules backend/__pycache__ backend/data
	docker compose down -v 2>/dev/null || true

secret: ## Generate a random secret key
	@openssl rand -hex 32
