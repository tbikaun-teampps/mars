# Backend

FastAPI backend with Supabase PostgreSQL.

## Setup

1. Install dependencies:

   ```bash
   uv sync
   ```

2. Create `.env` file from `.env.example`

3. Start Supabase local instance (see root README)

4. Run the development server:

```bash
uv run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

OpenAPI docs at `http://localhost:8000/docs`
