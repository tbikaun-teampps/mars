# MARS architecture

Material Analysis and Review System - technical architecture documentation.

---

## System overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Browser                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React Client (Vite)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Pages     │  │ Components  │  │  Contexts   │  │  React Query Cache  │ │
│  │  - Main     │  │  - Tables   │  │  - Auth     │  │  - Materials        │ │
│  │  - Settings │  │  - Forms    │  │  - Imperson │  │  - Reviews          │ │
│  │  - Account  │  │  - Charts   │  │             │  │  - Notifications    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                      │                                       │
│                              ApiClient (fetch)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ HTTP + JWT
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend (Python)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          API Routers                                 │    │
│  │  materials │ reviews │ rbac │ users │ audit │ dashboard │ lookups │     │    │
│  │  comments │ insights │ health │ notifications                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │    Auth     │  │   Config    │  │         SQLModel ORM                │  │
│  │  - JWT      │  │  - Supabase │  │  - DB Models (table=True)           │  │
│  │  - Imperson │  │  - CORS     │  │  - Response Schemas                 │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ asyncpg
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Supabase (PostgreSQL 17)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Auth       │  │  Core Data  │  │  Workflow   │  │  Configuration      │ │
│  │  - Users    │  │  - Materials│  │  - Reviews  │  │  - Roles            │ │
│  │  - Sessions │  │  - Insights │  │  - Comments │  │  - Lookups          │ │
│  │  - JWT      │  │  - History  │  │  - Notifs   │  │  - Audit Logs       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, TanStack Query, React Router |
| UI         | shadcn/ui, Radix UI, Tailwind CSS, Recharts, Plotly     |
| Forms      | react-hook-form, Zod                                    |
| Backend    | FastAPI, SQLModel, Pydantic, Python 3.11+               |
| Database   | PostgreSQL 17 (Supabase)                                |
| Auth       | Supabase Auth (JWT, HS256)                              |
| ORM        | SQLModel + SQLAlchemy 2.0 (async)                       |

---

## Frontend architecture

### Directory structure

```
client/src/
├── api/
│   ├── client.ts          # ApiClient class with auth headers
│   ├── queries.ts         # React Query hooks (30+ hooks)
│   └── query-keys.ts      # Centralised cache key factory
├── components/
│   ├── ui/                # 32 shadcn/ui base components
│   ├── settings/          # Admin management components
│   └── review-steps/      # 5-step review workflow forms
├── contexts/
│   ├── AuthContext.tsx    # Supabase auth state
│   └── ImpersonationContext.tsx  # Admin impersonation (dev only)
├── hooks/
│   ├── use-permissions.ts # Permission checking utilities
│   └── use-*-url-state.ts # URL-based filter persistence
├── lib/
│   └── permissions.ts     # Permission constants and helpers
├── pages/                 # Route-level components
├── types/
│   └── api.ts             # OpenAPI-generated types (107KB)
└── validators/            # Zod schemas
```

### State management

```
┌────────────────────────────────────────────────────────────────────┐
│                        State Architecture                           │
├────────────────────────────────────────────────────────────────────┤
│  Layer           │ Technology      │ Purpose                       │
├──────────────────┼─────────────────┼───────────────────────────────┤
│  Server State    │ React Query     │ API data, caching, sync       │
│  Auth State      │ React Context   │ Session, user, sign in/out    │
│  UI State        │ URL Params      │ Filters, pagination, sorting  │
│  Local State     │ useState        │ Form inputs, modals           │
└────────────────────────────────────────────────────────────────────┘
```

### API integration pattern

```typescript
// Type-safe API client with auth injection
class ApiClient {
  async request<T>(endpoint, options): Promise<T> {
    const session = await supabase.auth.getSession()
    headers['Authorization'] = `Bearer ${session.access_token}`
    // Optional impersonation header for admins
    if (impersonatedUserId) {
      headers['X-Impersonate-User-Id'] = impersonatedUserId
    }
    return fetch(endpoint, options)
  }
}

// React Query hooks consume ApiClient
export function useMaterials(params) {
  return useQuery({
    queryKey: queryKeys.materials.list(params),
    queryFn: () => apiClient.getMaterials(params),
  })
}
```

### Routing

| Route            | Component    | Purpose                        |
| ---------------- | ------------ | ------------------------------ |
| `/app/dashboard` | MainPage     | Dashboard metrics and charts   |
| `/app/audit-logs`| MainPage     | System audit trail             |
| `/app/uploads`   | MainPage     | Upload job history             |
| `/app/settings`  | SettingsPage | Admin: roles, lookups, users   |
| `/app/account`   | AccountPage  | User profile management        |

---

## Backend architecture

### Directory structure

```
backend/app/
├── main.py                # FastAPI app, router registration
├── api/                   # Route handlers
│   ├── materials.py       # Material CRUD, CSV uploads (1,643 LOC)
│   ├── reviews.py         # Multi-step review workflow (536 LOC)
│   ├── rbac.py            # Role/user management (956 LOC)
│   ├── audit.py           # Audit log queries (528 LOC)
│   ├── dashboard.py       # Metrics endpoints (312 LOC)
│   ├── lookups.py         # Dropdown configuration (463 LOC)
│   ├── users.py           # User profiles (109 LOC)
│   ├── comments.py        # Review comments (168 LOC)
│   ├── insights.py        # Material insights (93 LOC)
│   ├── notifications.py   # User notifications (228 LOC)
│   └── health.py          # Health checks (70 LOC)
├── core/
│   ├── config.py          # Environment settings
│   ├── auth.py            # JWT verification, impersonation
│   └── database.py        # Async SQLModel session
├── services/
│   └── notification_service.py  # Notification creation logic
└── models/
    ├── db_models.py       # SQLModel ORM models (table=True)
    ├── rbac.py            # Role/permission schemas
    ├── review.py          # Review workflow schemas
    ├── material.py        # Material response schemas
    ├── upload.py          # Upload job schemas
    ├── audit.py           # Audit log schemas
    ├── lookup.py          # Lookup option schemas
    ├── notification.py    # Notification schemas
    └── user.py            # User profile schemas
```

### Authentication flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Client  │───▶│ Supabase│───▶│ FastAPI │───▶│   DB    │
└─────────┘    │  Auth   │    │  Auth   │    └─────────┘
               └─────────┘    └─────────┘
                    │              │
                    │  JWT Token   │  Verify JWT
                    │  (HS256)     │  Extract user_id
                    ▼              ▼
              ┌─────────────────────────┐
              │  get_current_user()     │
              │  - Decode JWT           │
              │  - Check impersonation  │
              │  - Return User object   │
              └─────────────────────────┘
```

### Authorization (RBAC)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Permission Model                                  │
├─────────────────────────────────────────────────────────────────────┤
│  User ──┬── UserRole ──── Role ──── Permissions (11 flags)          │
│         │    (validity)                                              │
│         │                                                            │
│         └── SMEExpertise ──── Specialty + Capacity                  │
└─────────────────────────────────────────────────────────────────────┘

Permissions:
  can_create_reviews       can_approve_reviews      can_manage_users
  can_edit_reviews         can_provide_sme_review   can_manage_settings
  can_delete_reviews       can_assign_reviews       can_export_data
  can_view_all_reviews     can_manage_acknowledgements

Role Types: workflow | sme | approval | admin

Security Functions:
  - get_user_permissions()      → Aggregate active role permissions (OR logic)
  - require_user_admin()        → Require specific permission(s)
  - check_privilege_escalation() → Prevent assigning roles you don't have
  - check_admin_self_demotion() → Prevent removing own admin role
  - check_last_system_admin()   → Prevent orphaning the system
```

---

## Database schema

### Entity relationship diagram

```
                              ┌─────────────────┐
                              │    profiles     │
                              │  (Supabase)     │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │  user_roles   │          │ sme_expertise │          │    (audit)    │
   │  (many-many)  │          │ (specialty)   │          │   tracking    │
   └───────┬───────┘          └───────────────┘          └───────────────┘
           │
           ▼
   ┌───────────────┐
   │     roles     │
   │ (permissions) │
   └───────────────┘


   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
   │sap_material_  │─────────▶│material_      │          │ upload_jobs   │
   │    data       │          │  reviews      │◀─────────│ (async)       │
   │  (master)     │          │ (workflow)    │          └───────┬───────┘
   └───────┬───────┘          └───────┬───────┘                  │
           │                          │                          ▼
           │                          ├──────────────▶ review_checklist
           │                          ├──────────────▶ review_comments
           │                          ├──────────────▶ review_attachments
           │                          └──────────────▶ review_assignments
           │
           ├──────────────────▶ material_insights
           ├──────────────────▶ material_data_history
           └──────────────────▶ review_schedules


   ┌───────────────┐          ┌───────────────┐
   │lookup_options │          │  audit_logs   │
   │ (config)      │          │ (system-wide) │
   └───────────────┘          └───────────────┘
```

### Core tables

| Table                 | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `profiles`            | User profiles (synced from Supabase auth)    |
| `sap_material_data`   | Master inventory data from SAP uploads       |
| `material_insights`   | Auto-generated issues/opportunities          |
| `material_reviews`    | Multi-step review workflow records           |
| `review_checklist`    | Mandatory verification checklist per review  |
| `review_comments`     | Discussion thread on reviews                 |
| `notifications`       | In-app user notifications                    |
| `review_assignments`  | Task assignments (owner, SME, approver)      |
| `upload_jobs`         | Async CSV/Excel upload tracking              |
| `material_data_history`| Change snapshots per upload                 |
| `roles`               | Role definitions with permission flags       |
| `user_roles`          | User-role assignments with validity periods  |
| `sme_expertise`       | SME specializations and capacity             |
| `lookup_options`      | Configurable dropdown values                 |
| `audit_logs`          | System-wide change tracking                  |

### Review workflow states

```
                    ┌─────────┐
                    │  draft  │
                    └────┬────┘
                         │ Submit for SME review
                         ▼
                  ┌─────────────┐
                  │ pending_sme │
                  └──────┬──────┘
                         │ SME provides recommendation
                         ▼
               ┌──────────────────┐
               │ pending_decision │
               └────────┬─────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
      ┌───────────┐          ┌───────────┐
      │ completed │          │ cancelled │
      └───────────┘          └───────────┘
```

### Database triggers

| Trigger                        | Table            | Action                              |
| ------------------------------ | ---------------- | ----------------------------------- |
| `on_auth_user_created`         | auth.users       | Create profile record               |
| `material_reviews_audit`       | material_reviews | Log changes to audit_logs           |
| `review_checklist_audit`       | review_checklist | Log changes to audit_logs           |
| `review_comments_audit`        | review_comments  | Log changes to audit_logs           |
| `material_insights_audit`      | material_insights| Log updates to audit_logs           |

---

## Data flow

### Material upload pipeline

```
┌─────────┐    ┌──────────────┐    ┌───────────────┐    ┌─────────────┐
│  User   │───▶│ Upload CSV/  │───▶│ Background    │───▶│ Database    │
│         │    │ Excel file   │    │ Processing    │    │ Updates     │
└─────────┘    └──────────────┘    └───────────────┘    └─────────────┘
                     │                    │
                     ▼                    ▼
              ┌─────────────┐     ┌──────────────────────────┐
              │ upload_jobs │     │ Phases:                  │
              │ (pending)   │     │ 1. validating            │
              └─────────────┘     │ 2. materials (upsert)    │
                                  │ 3. history (snapshots)   │
                                  │ 4. insights (generate)   │
                                  │ 5. reviews (staleness)   │
                                  └──────────────────────────┘
```

### Review workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        5-Step Review Process                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Step 1: General Info                                                    │
│    - Review reason, current stock, proposed action                       │
│    - Business justification                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Step 2: Checklist (7 mandatory items)                                   │
│    - Open orders, forecast demand, alternate plants                      │
│    - Procurement contact, BOM usage, supersession, history               │
├─────────────────────────────────────────────────────────────────────────┤
│  Step 3: SME Investigation                                               │
│    - SME contact and feedback tracking                                   │
│    - Recommendation, analysis, risk assessment                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Step 4: Follow-up                                                       │
│    - Schedule next review if needed                                      │
│    - Set frequency and reason                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Step 5: Final Decision                                                  │
│    - Approve action, set final quantities                                │
│    - Record estimated savings, implementation date                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API structure

### Router prefixes

| Router        | Prefix               | Tag           |
| ------------- | -------------------- | ------------- |
| health        | `/api/health`        | Health        |
| materials     | `/api/materials`     | Materials     |
| reviews       | `/api/reviews`       | Reviews       |
| comments      | `/api/comments`      | Comments      |
| notifications | `/api/notifications` | Notifications |
| audit         | `/api/audit`         | Audit         |
| users         | `/api/users`         | Users         |
| insights      | `/api/insights`      | Insights      |
| dashboard     | `/api/dashboard`     | Dashboard     |
| lookups       | `/api/lookups`       | Lookups       |
| rbac          | `/api/rbac`          | RBAC          |

### Key endpoints

```
Materials
  GET    /api/materials              # Paginated list with filters
  GET    /api/materials/{id}         # Single material with reviews
  POST   /api/materials/upload       # Initiate CSV upload
  GET    /api/materials/upload/{id}  # Upload job status

Reviews
  GET    /api/reviews                # List reviews
  POST   /api/reviews                # Create draft review
  PUT    /api/reviews/{id}           # Update review step
  PUT    /api/reviews/{id}/status    # Change workflow status

RBAC
  GET    /api/rbac/roles             # List roles
  POST   /api/rbac/roles             # Create role
  GET    /api/rbac/user-roles        # List user assignments
  POST   /api/rbac/user-roles        # Assign role to user
  GET    /api/rbac/sme-expertise     # List SME capabilities

Notifications
  GET    /api/notifications              # Paginated user notifications
  GET    /api/notifications/unread-count # Badge count
  PUT    /api/notifications/{id}/read    # Mark single as read
  PUT    /api/notifications/mark-all-read # Mark all as read
  GET    /api/notifications/preferences  # Get user preferences
  PUT    /api/notifications/preferences  # Update preferences

Users
  GET    /api/users/me               # Current user with permissions
  PUT    /api/users/me               # Update profile

Lookups
  GET    /api/lookups/options        # Grouped dropdown options
  POST   /api/lookups/options        # Create option
  PUT    /api/lookups/options/{id}   # Update option
```

---

## Security model

### Authentication

- Supabase handles user registration and session management
- JWT tokens issued with HS256 algorithm
- Backend validates JWT on every request via `get_current_user()` dependency
- Tokens include `sub` (user ID) and `email` claims

### Authorization layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: Authentication                                             │
│    - JWT validation (all protected endpoints)                        │
│    - User identity extraction                                        │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Role-Based Access Control                                  │
│    - Permission flags aggregated from active roles                   │
│    - Temporal validity (valid_from, valid_to)                        │
│    - require_user_admin() for protected operations                   │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Business Rules                                             │
│    - Privilege escalation prevention                                 │
│    - Self-demotion protection                                        │
│    - Last admin protection                                           │
│    - Approval limits (financial thresholds)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Impersonation (development only)

- Enabled via `debug_mode` configuration flag
- Only admins can impersonate other users
- Uses `X-Impersonate-User-Id` header
- Tracks actual vs impersonated user for audit
- Frontend shows banner indicating impersonation active

---

## Audit and compliance

### Audit trail coverage

| Entity            | Tracked Operations     | Storage               |
| ----------------- | ---------------------- | --------------------- |
| Material Reviews  | INSERT, UPDATE, DELETE | audit_logs (trigger)  |
| Review Checklists | INSERT, UPDATE, DELETE | audit_logs (trigger)  |
| Review Comments   | INSERT, UPDATE, DELETE | audit_logs (trigger)  |
| Material Insights | UPDATE                 | audit_logs (trigger)  |
| User Roles        | All changes            | user_role_history     |
| Review Assignments| All changes            | assignment_history    |
| Lookup Options    | All changes            | lookup_options_history|
| Material Data     | INSERT, UPDATE         | material_data_history |

### Audit record structure

```json
{
  "audit_id": 12345,
  "table_name": "material_reviews",
  "record_id": "456",
  "operation": "UPDATE",
  "old_values": { "status": "draft", "proposed_action": null },
  "new_values": { "status": "pending_sme", "proposed_action": "scrap" },
  "fields_changed": ["status", "proposed_action"],
  "changed_by": "user-uuid",
  "changed_at": "2025-12-16T10:30:00Z"
}
```

---

## Development and deployment

### Local development

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000

# Frontend
cd client
npm install
npm run dev  # Starts on port 5173, proxies /api to :8000

# Database
supabase start  # Local Supabase instance
supabase db reset  # Apply migrations and seed data
```

### Environment configuration

| Variable            | Purpose                              |
| ------------------- | ------------------------------------ |
| `SUPABASE_URL`      | Supabase project URL                 |
| `SUPABASE_KEY`      | Supabase anon/public key             |
| `SUPABASE_SERVICE_KEY` | Supabase service role key         |
| `SUPABASE_JWT_SECRET`  | JWT signing secret                 |
| `DATABASE_URL`      | PostgreSQL connection string         |
| `DEBUG_MODE`        | Enable impersonation (dev only)      |
| `CORS_ORIGINS`      | Allowed CORS origins                 |

### Type generation workflow

```bash
# 1. Backend generates OpenAPI spec at /api/openapi.json
# 2. Frontend generates TypeScript types
cd client
npm run generate:types  # openapi-typescript → src/types/api.ts
```

---

## Performance considerations

### Database indexes (40+)

Indexes optimised for common query patterns:

- **Workflow queries**: status, next_review_date, initiated_by
- **User lookups**: user_id with is_active filters
- **Audit queries**: table_name + record_id, changed_at DESC
- **Material filters**: material_type, plant, mat_group, mrp_controller
- **Upload tracking**: upload_job_id, created_at

### React Query caching

```typescript
{
  staleTime: 30_000,        // 30 seconds fresh
  gcTime: 5 * 60 * 1000,    // 5 minutes cache retention
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}
```

### Async operations

- All database operations use async SQLAlchemy with asyncpg
- File uploads processed in background tasks with progress tracking
- Frontend uses optimistic updates for review mutations

---

## Future considerations

Areas identified for potential enhancement:

- **Row-Level Security**: Currently enforced at application layer; RLS policies could provide defense-in-depth
- **Real-time updates**: Supabase Realtime could push review status changes to connected clients
- **File storage**: Review attachments could use Supabase Storage for managed file handling
- **Email notifications**: Add email delivery channel to the existing in-app notification system
- **Bulk operations**: Batch review creation and approval for high-volume scenarios
