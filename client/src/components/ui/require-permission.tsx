import * as React from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface RequirePermissionProps {
  permission: Permission | Permission[];
  children: React.ReactElement;
  /** "disable" shows tooltip + toast on click, "hide" removes from DOM */
  fallback?: "disable" | "hide";
  /** Message shown in tooltip and toast */
  message?: string;
  /** Require all permissions (default) or any */
  mode?: "all" | "any";
}

/**
 * Wrapper component for permission-based UI control.
 *
 * @example
 * // Disable button with tooltip + toast
 * <RequirePermission permission="can_manage_acknowledgements">
 *   <Button>Acknowledge</Button>
 * </RequirePermission>
 *
 * @example
 * // Hide element entirely
 * <RequirePermission permission="can_export_data" fallback="hide">
 *   <Button>Export</Button>
 * </RequirePermission>
 *
 * @example
 * // Require any of multiple permissions
 * <RequirePermission permission={["can_edit_reviews", "can_delete_reviews"]} mode="any">
 *   <Button>Edit</Button>
 * </RequirePermission>
 */
export function RequirePermission({
  permission,
  children,
  fallback = "disable",
  message = "You don't have permission to perform this action",
  mode = "all",
}: RequirePermissionProps) {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess =
    mode === "any"
      ? hasAnyPermission(...permissions)
      : hasAllPermissions(...permissions);

  if (hasAccess) {
    return children;
  }

  if (fallback === "hide") {
    return null;
  }

  // Disable mode: wrap with tooltip and intercept clicks
  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.error(message);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={handleBlockedClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toast.error(message);
              }
            }}
            style={{ cursor: "not-allowed" }}
          >
            {React.cloneElement(children, {
              disabled: true,
              "aria-disabled": true,
              style: { ...children.props.style, pointerEvents: "none" },
            })}
          </span>
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
