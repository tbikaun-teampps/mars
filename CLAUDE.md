# Material Analysis and Review System (MARS)

This repository is a mono-repo consisting of a backend server (python/FastAPI) and frontend client (nodejs/react/vite). The database is Postgresql via supabase.

---

## Ways of Working

All new features or things of importance should be summarised in this document to ensure knowledge sharing and avoid siloing.

- **Scope discipline**: Only address issues within the scope of your current task. Do not fix unrelated bugs, lint errors, or type errors unless explicitly instructed.
- **Documentation bias**: When complexity arises, err on the side of over-documentation to aid human programmers.
- **Seek feedback**: Always request human input when facing complexity, uncertainty, or ambiguous requirements.
- **Consult architecture**: Review the architecture diagram (`docs/architecture.md`) before making significant structural decisions. This is an evolving artifact—propose updates when changes warrant.
- **Maintain this document**: Summarise all changes in the changelog and decision log sections.

---

## Document Style Guide

- Use sentence case for headings
- Keep directives concise and actionable
- Group related rules under logical sections
- Include runnable commands where applicable
- Use `IMPORTANT:` callouts for critical gotchas
- Adhere to this style guide when making edits

---

## System Overview

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Client   │────▶│  FastAPI Server │────▶│    Supabase     │
│  (Vite + TS)    │     │  (Python 3.x)   │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Consult the full application architecture diagram (`docs/architecture.md`) before making significant structural decisions. This is an evolving artifact—propose updates when changes warrant.

For frontend permission handling, see `docs/permissions-ui.md`. To add new permissions, see `docs/extending-permissions.md`.

### Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React, TypeScript, Vite, TanStack   |
| Backend  | FastAPI, SQLModel, Pydantic, Python |
| Database | PostgreSQL (Supabase)               |
| Auth     | Supabase Auth                       |

---

---

## Common Commands

### Frontend

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Type check (run after completing features)
npm run typecheck

# Generate OpenAPI types from backend
npm run generate:types
```

### Backend

```bash
# Install dependencies
uv sync

# Run dev server
uv run uvicorn app.main:app --reload

# Format code
uv run ruff format .

# Lint code
uv run ruff check .
```

### Database

```bash
# Generate a new migration
npx supabase migrations new <migration_name>

# Apply migrations
npx supabase up

# Reset database
npx supabase db reset
```

---

## Frontend

### Rules

- Always `run npm typecheck` after completing features.
- Never resolve TypeScript errors outside the scope of your task—only fix errors you have potentially introduced.
- Always run `npm run generate:types` to get the latest OpenAPI types generated from the backend server.

---

## Backend

### General Rules

- Use type hints on all function signatures—no exceptions.
- Keep business logic out of route handlers; delegate to service layers.
- Use dependency injection for database sessions and auth context.
- Prefer `async def` endpoints for I/O-bound operations.

### SQLModel & Database

- Distinguish between `table=True` models (ORM/database) and plain SQLModel classes (API schemas). Do not conflate them.
- Never modify migration files after they have been applied to any environment.
- When creating relationships, explicitly define `back_populates` on both sides.
- Use `select()` with explicit columns for read-heavy queries to avoid N+1 issues.

### FastAPI

- Use Pydantic models (or SQLModel without `table=True`) for request/response schemas.
- Return explicit response models via `response_model=` to control serialisation.
- Group related endpoints under routers with clear prefixes and tags.

---

## Caveats & Gotchas

Document known quirks, footguns, and non-obvious behaviours here.

| Area       | Issue                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| SQLModel   | Circular imports are common with relationships; use `TYPE_CHECKING` guards and string annotations.       |
| SQLModel   | `table=True` models with optional fields need `Field(default=None)` explicitly, or validation will fail. |
| SQLAlchemy | Use `.is_(True)`, `.is_(False)`, `.is_(None)` instead of `== True/False/None` to satisfy ruff linter (E711/E712). |
| Supabase   | RLS policies apply even to service role in some contexts; verify permissions when debugging 403s.        |
| Vite       | Environment variables must be prefixed with `VITE_` to be exposed to the client.                         |

---

## Decision Log

Record significant architectural or implementation decisions here with rationale.

### YYYY-MM-DD: [Decision Title]

**Context**: Why did this decision need to be made?

**Decision**: What was decided?

**Rationale**: Why was this option chosen over alternatives?

**Consequences**: What trade-offs or follow-up work does this create?

---

## Changelog

Summarise all changes to this document below. Add new entries at the top.

| Date       | Summary                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| 2025-12-16 | Added `docs/extending-permissions.md` guide for adding new permissions  |
| 2025-12-16 | Added `can_upload_data` permission to RBAC system                       |
| 2025-12-16 | Added `docs/permissions-ui.md` documenting frontend permission controls |
| 2025-12-16 | Added SQLAlchemy `.is_()` caveat for boolean/None comparisons           |
| 2025-12-16 | Added system overview, backend rules, caveats, and decision log section |
| 2025-12-16 | Initial structure and core principles established                       |
