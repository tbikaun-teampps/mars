import { useCurrentUser } from "@/api/queries";
import type { Permission } from "@/lib/permissions";

/**
 * Hook for checking user permissions.
 * Admins automatically have all permissions.
 */
export function usePermissions() {
  const { data: currentUser, isLoading } = useCurrentUser();

  const permissions = currentUser?.permissions ?? [];
  const isAdmin = currentUser?.is_admin ?? false;

  const hasPermission = (permission: Permission): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (...perms: Permission[]): boolean => {
    if (isAdmin) return true;
    return perms.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (...perms: Permission[]): boolean => {
    if (isAdmin) return true;
    return perms.every((p) => permissions.includes(p));
  };

  return {
    permissions,
    isAdmin,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
