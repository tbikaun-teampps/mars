# Extending permissions

This guide describes how to add a new permission to the RBAC system.

---

## Files to modify

Adding a permission requires changes across the full stack:

| Layer    | File                                          | Change                                      |
| -------- | --------------------------------------------- | ------------------------------------------- |
| Database | `supabase/migrations/20251215050911_add_rbac.sql` | Add column to `roles` table, update INSERT  |
| Backend  | `backend/app/models/db_models.py`             | Add field to `RoleDB` class                 |
| Backend  | `backend/app/models/rbac.py`                  | Add field to `RoleResponse` schema          |
| Backend  | `backend/app/api/rbac.py`                     | Add to `PERMISSION_FIELDS` list             |
| Frontend | `client/src/lib/permissions.ts`               | Add to `ALL_PERMISSIONS` and `PERMISSION_LABELS` |
| Frontend | `client/src/components/settings/roles-list.tsx` | Add to local `PERMISSION_LABELS`          |
| Docs     | `docs/permissions-ui.md`                      | Add to available permissions table          |

---

## Step-by-step process

### 1. Database migration

Add the column to the `roles` table definition:

```sql
can_your_permission BOOLEAN DEFAULT false,
```

Update the INSERT statement to include the new column and set appropriate defaults for each role.

### 2. Backend models

In `db_models.py`, add to `RoleDB`:

```python
can_your_permission: bool = Field(default=False)
```

In `rbac.py`, add to `RoleResponse`:

```python
can_your_permission: bool
```

### 3. Backend API

In `api/rbac.py`, add to `PERMISSION_FIELDS`:

```python
'can_your_permission',
```

### 4. Apply migration and regenerate types

```bash
npx supabase db reset          # Dev only - use new migration in prod
npm run generate:types         # In client directory
```

### 5. Frontend permissions

In `permissions.ts`, add to both arrays:

```typescript
// ALL_PERMISSIONS
"can_your_permission",

// PERMISSION_LABELS
can_your_permission: "Your Permission Label",
```

In `roles-list.tsx`, add to local `PERMISSION_LABELS`:

```typescript
can_your_permission: "Your Permission Label",
```

### 6. Verify

```bash
npm run typecheck
```

TypeScript will error if the permission is missing from any required location due to the `Permission` type being derived from `RoleResponse`.

---

## Using the permission

### Frontend

```tsx
import { usePermissions } from "@/hooks/use-permissions";
import { RequirePermission } from "@/components/ui/require-permission";

// Hook-based check
const { hasPermission } = usePermissions();
if (hasPermission("can_your_permission")) {
  // ...
}

// Component-based check
<RequirePermission permission="can_your_permission">
  <Button>Protected Action</Button>
</RequirePermission>
```

### Backend

Permissions are aggregated from user roles via `get_user_permissions()` in `api/rbac.py`. Check permissions in route handlers by verifying the permission string is in the user's permissions list.

---

## Naming conventions

- Use snake_case prefixed with `can_`
- Be specific: `can_upload_data` not `can_upload`
- Labels should be title case: "Upload Data"