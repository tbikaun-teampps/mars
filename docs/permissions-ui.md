# Permissions UI

This document describes the frontend permission system used to control UI access based on user roles.

---

## Overview

The permissions system provides:

- **Type-safe permissions** derived from the backend OpenAPI schema
- **React hooks** for checking permissions in components
- **Wrapper components** for declarative permission-controlled UI
- **Admin bypass** - admins automatically pass all permission checks

---

## Permission definitions

Permissions are defined in `client/src/lib/permissions.ts` and are derived from the backend `RoleResponse` schema.

```typescript
import type { Permission } from "@/lib/permissions";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions";
```

### Available permissions

| Permission                   | Label                  |
| ---------------------------- | ---------------------- |
| `can_create_reviews`         | Create Reviews         |
| `can_edit_reviews`           | Edit Reviews           |
| `can_delete_reviews`         | Delete Reviews         |
| `can_approve_reviews`        | Approve Reviews        |
| `can_provide_sme_review`     | Provide SME Review     |
| `can_assign_reviews`         | Assign Reviews         |
| `can_manage_users`           | Manage Users           |
| `can_manage_settings`        | Manage Settings        |
| `can_view_all_reviews`       | View All Reviews       |
| `can_export_data`            | Export Data            |
| `can_manage_acknowledgements`| Manage Acknowledgements|
| `can_upload_data`            | Upload Data            |

---

## usePermissions hook

The primary hook for checking permissions. Located at `client/src/hooks/use-permissions.ts`.

```typescript
import { usePermissions } from "@/hooks/use-permissions";

function MyComponent() {
  const {
    permissions,       // Permission[] - array of user's permissions
    isAdmin,           // boolean - true if user is admin
    isLoading,         // boolean - true while fetching user data
    hasPermission,     // (permission: Permission) => boolean
    hasAnyPermission,  // (...perms: Permission[]) => boolean
    hasAllPermissions, // (...perms: Permission[]) => boolean
  } = usePermissions();

  // Check a single permission
  if (hasPermission("can_export_data")) {
    // render export button
  }

  // Check if user has ANY of the listed permissions
  if (hasAnyPermission("can_edit_reviews", "can_delete_reviews")) {
    // render edit controls
  }

  // Check if user has ALL of the listed permissions
  if (hasAllPermissions("can_create_reviews", "can_assign_reviews")) {
    // render assignment UI
  }
}
```

**IMPORTANT**: Admins automatically return `true` for all permission checks. You do not need to handle admin bypass separately.

---

## RequirePermission component

A wrapper component for declarative permission control. Located at `client/src/components/ui/require-permission.tsx`.

### Props

| Prop         | Type                        | Default     | Description                                      |
| ------------ | --------------------------- | ----------- | ------------------------------------------------ |
| `permission` | `Permission \| Permission[]`| required    | Permission(s) to check                           |
| `children`   | `React.ReactElement`        | required    | Element to render if permitted                   |
| `fallback`   | `"disable" \| "hide"`       | `"disable"` | Behaviour when permission denied                 |
| `message`    | `string`                    | Default msg | Custom message for tooltip/toast                 |
| `mode`       | `"all" \| "any"`            | `"all"`     | Require all permissions or any                   |

### Fallback behaviours

- **`"disable"`** (default): Renders the child disabled with a tooltip. Shows a toast notification on click.
- **`"hide"`**: Removes the element from the DOM entirely.

### Usage examples

```tsx
import { RequirePermission } from "@/components/ui/require-permission";
import { Button } from "@/components/ui/button";

// Basic usage - disables button if permission missing
<RequirePermission permission="can_manage_acknowledgements">
  <Button>Acknowledge</Button>
</RequirePermission>

// Hide element entirely when permission missing
<RequirePermission permission="can_export_data" fallback="hide">
  <Button>Export</Button>
</RequirePermission>

// Require ANY of multiple permissions
<RequirePermission
  permission={["can_edit_reviews", "can_delete_reviews"]}
  mode="any"
>
  <Button>Edit</Button>
</RequirePermission>

// Require ALL permissions with custom message
<RequirePermission
  permission={["can_create_reviews", "can_assign_reviews"]}
  mode="all"
  message="You need review creation and assignment permissions"
>
  <Button>Create & Assign</Button>
</RequirePermission>
```

---

## Context providers

The app wraps components with auth providers in `client/src/main.tsx`:

```tsx
<AuthProvider>
  <ImpersonationProvider>
    {/* App content */}
  </ImpersonationProvider>
</AuthProvider>
```

### AuthProvider

Located at `client/src/contexts/AuthContext.tsx`. Manages Supabase authentication session state.

### ImpersonationProvider

Located at `client/src/contexts/ImpersonationContext.tsx`. Allows admins to impersonate other users for testing/debugging.

```typescript
import { useImpersonation } from "@/contexts/ImpersonationContext";

const {
  impersonatedUserId,      // string | null
  isImpersonating,         // boolean
  startImpersonating,      // (userId: string) => void
  stopImpersonating,       // () => void
} = useImpersonation();
```

When impersonation is active, the `useCurrentUser()` query returns the impersonated user's data, and permission checks reflect that user's permissions.

---

## Data fetching

Permission data is fetched via React Query hooks in `client/src/api/queries.ts`:

```typescript
import { useCurrentUser, useRoles, useRole } from "@/api/queries";

// Get current user with permissions
const { data: user } = useCurrentUser();
// user.permissions: string[]
// user.is_admin: boolean

// Get all roles
const { data: roles } = useRoles();

// Get single role with full permission details
const { data: role } = useRole(roleId);
```

---

## Best practices

1. **Use `RequirePermission` for UI controls** - Prefer the declarative component over manual permission checks for buttons and interactive elements.

2. **Use `usePermissions` hook for conditional rendering** - When you need more complex logic or need to check permissions across multiple elements.

3. **Choose appropriate fallback behaviour**:
   - Use `fallback="disable"` when users should know the action exists but is restricted
   - Use `fallback="hide"` when the feature should be invisible to unpermitted users

4. **Don't duplicate admin checks** - The permission system automatically grants admins all permissions. Never write `if (isAdmin || hasPermission(...))`.

5. **Backend validation is required** - Frontend permission checks are for UX only. Always validate permissions server-side.
