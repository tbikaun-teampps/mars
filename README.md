# MARS: Material Analysis & Review System 

A modern full-stack application with FastAPI backend, React frontend, and Supabase PostgreSQL database.

## Project Structure

```
mars/
├── backend/          # FastAPI server
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── core/     # Core configuration
│   │   ├── models/   # Database models
│   │   └── main.py   # Application entry point
│   ├── pyproject.toml
│   └── .env.example
├── client/           # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/      # API client utilities
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/    # Generated TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── scripts/
│   │   └── generate-api-types.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## Prerequisites

- **Python 3.11+** with [uv](https://github.com/astral-sh/uv) package manager
- **Node.js 18+** with npm
- **Supabase CLI** for local PostgreSQL database

### Installing Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm (all platforms)
npm install -g supabase
```

## Setup Instructions

### 1. Install Dependencies

**Backend:**

```bash
cd backend
uv sync
```

**Client:**

```bash
cd client
npm install
```

### 2. Set Up Supabase Local Database

Initialize Supabase in the project root:

```bash
# From project root
supabase init
```

Start the local Supabase instance (PostgreSQL + Studio):

```bash
supabase start
```

This will start:
- PostgreSQL database on `localhost:54322`
- Supabase Studio on `http://localhost:54323`
- API Gateway on `http://localhost:54321`

**Note:** Save the API keys shown after running `supabase start` - you'll need them for configuration.

### 3. Configure Environment Variables

**Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials from `supabase start`
```

**Client:**

```bash
cd client
cp .env.example .env
# Edit if needed (defaults work for local development)
```

### 4. Start Development Servers

Open three terminal windows:

**Terminal 1 - Backend:**

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

**Terminal 2 - Client:**

```bash
cd client
npm run dev
```

Client will be available at `http://localhost:5173`

**Terminal 3 - Type Generation (optional):**

After starting the backend, generate TypeScript types from OpenAPI:

```bash
cd client
npm run generate:types
```

This creates `client/src/types/api.ts` with type-safe API definitions.

## Development Workflow

### Adding New API Endpoints

1. Create a new router in `backend/app/api/`
2. Register it in `backend/app/main.py`
3. Restart the backend server
4. Generate TypeScript types: `npm run generate:types` (from client directory)
5. Use the generated types in your React components

Example:

```python
# backend/app/api/users.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/users")
async def get_users():
    return [{"id": 1, "name": "John"}]
```

```python
# backend/app/main.py
from app.api import users

app.include_router(users.router, prefix="/api", tags=["users"])
```

### Database Migrations

Supabase uses migrations for schema changes:

```bash
# Create a new migration
supabase migration new your_migration_name

# Edit the SQL file in supabase/migrations/

# Apply migrations
supabase db reset  # Resets and applies all migrations
```

### Using the API Client

```typescript
// Import the API client
import { apiClient } from '@/api';

// Make type-safe requests
const users = await apiClient.get<User[]>('/users');
```

## Available Scripts

### Backend

- `uv sync` - Install/update dependencies
- `uv run uvicorn app.main:app --reload` - Start dev server
- `uv run pytest` - Run tests (after adding pytest)

### Client

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run generate:types` - Generate TypeScript types from OpenAPI schema

### Supabase

- `supabase start` - Start local instance
- `supabase stop` - Stop local instance
- `supabase status` - Check status and get connection details
- `supabase db reset` - Reset database and run migrations
- `supabase migration new <name>` - Create new migration

Dump data from local database to use as a seed script:
```bash
npx supabase db dump -f 'seed-test.sql' --local --data-only
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **uv** - Fast Python package manager
- **SQLAlchemy** - SQL toolkit and ORM
- **Pydantic** - Data validation using Python type annotations
- **Supabase Client** - Python client for Supabase

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **openapi-typescript** - Generate TypeScript types from OpenAPI

### Database
- **Supabase** - Open source Firebase alternative
- **PostgreSQL** - Relational database

## Project Features

- ✅ Type-safe API communication (OpenAPI → TypeScript)
- ✅ Hot module replacement for both frontend and backend
- ✅ CORS configured for local development
- ✅ Environment variable management
- ✅ API proxy through Vite (no CORS issues in dev)
- ✅ Local PostgreSQL with Supabase
- ✅ Modern Python tooling with uv
- ✅ ESLint + TypeScript strict mode

## Troubleshooting

### Backend won't start
- Check that port 8000 is available
- Ensure `uv sync` completed successfully
- Verify `.env` file exists with correct values

### Client won't start
- Check that port 5173 is available
- Ensure `npm install` completed successfully
- Clear node_modules and reinstall if needed

### Supabase connection issues
- Run `supabase status` to check if services are running
- Verify DATABASE_URL in backend/.env matches Supabase connection string
- Check that port 54322 (PostgreSQL) is available

### Type generation fails
- Ensure backend is running before generating types
- Check BACKEND_URL in client/.env
- Verify `/openapi.json` endpoint is accessible

## Next Steps

1. Define your database schema in `supabase/migrations/`
2. Create SQLAlchemy models in `backend/app/models/`
3. Build API endpoints in `backend/app/api/`
4. Generate TypeScript types with `npm run generate:types`
5. Create React components in `client/src/components/`
6. Build your application!

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
