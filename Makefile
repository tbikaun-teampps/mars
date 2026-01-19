.PHONY: all start stop install install-client install-backend supabase backend client clean help db-reset db-migrate typecheck lint format generate-types

# Default target - start all services
all: start

# Start all services (supabase, backend, client)
start:
	@echo "Starting all services..."
	@make -j3 supabase backend client

# Stop all services
stop:
	@echo "Stopping supabase..."
	@npx supabase stop

# Install all dependencies
install: install-client install-backend
	@echo "All dependencies installed"

install-client:
	@echo "Installing client dependencies..."
	@cd client && npm install

install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && uv sync

# Individual service targets
supabase:
	@echo "Starting Supabase..."
	@npx supabase start

backend:
	@echo "Starting FastAPI backend..."
	@cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

client:
	@echo "Starting Vite dev server..."
	@cd client && npm run dev

# Database operations
db-reset:
	@echo "Resetting database..."
	@npx supabase db reset

db-migrate:
	@echo "Applying migrations..."
	@npx supabase up

# Code quality
typecheck:
	@echo "Running TypeScript type check..."
	@cd client && npm run typecheck

lint:
	@echo "Linting backend code..."
	@cd backend && uv run ruff check .

format:
	@echo "Formatting backend code..."
	@cd backend && uv run ruff format .

# Generate OpenAPI types
generate-types:
	@echo "Generating OpenAPI types from backend..."
	@cd client && npm run generate:types

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf client/node_modules/.vite
	@rm -rf backend/.ruff_cache

# Help
help:
	@echo "MARS Development Commands"
	@echo ""
	@echo "Service Management:"
	@echo "  make start          - Start all services (supabase, backend, client)"
	@echo "  make stop           - Stop supabase services"
	@echo "  make supabase       - Start Supabase only"
	@echo "  make backend        - Start FastAPI backend only"
	@echo "  make client         - Start Vite client only"
	@echo ""
	@echo "Setup:"
	@echo "  make install        - Install all dependencies"
	@echo "  make install-client - Install client dependencies"
	@echo "  make install-backend- Install backend dependencies"
	@echo ""
	@echo "Database:"
	@echo "  make db-reset       - Reset database"
	@echo "  make db-migrate     - Apply migrations"
	@echo ""
	@echo "Code Quality:"
	@echo "  make typecheck      - Run TypeScript type check"
	@echo "  make lint           - Lint backend code"
	@echo "  make format         - Format backend code"
	@echo "  make generate-types - Generate OpenAPI types from backend"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make help           - Show this help message"