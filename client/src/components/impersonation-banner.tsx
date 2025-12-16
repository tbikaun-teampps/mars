import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useUsersList } from "@/api/queries";
import { useAuth } from "@/hooks/useAuth";

/**
 * Banner component displayed when an admin is impersonating another user.
 * Shows at the top of the page with warning styling.
 */
export function ImpersonationBanner() {
  const { impersonatedUserId, isImpersonating, stopImpersonating } =
    useImpersonation();
  const { user: originalUser } = useAuth();

  // Fetch users to get the impersonated user's details
  const { data: users } = useUsersList({ isActive: true }, isImpersonating);

  if (!isImpersonating) {
    return null;
  }

  const impersonatedUser = users?.find((u) => u.user_id === impersonatedUserId);
  const impersonatedName = impersonatedUser?.full_name || "Unknown User";
  const impersonatedEmail = impersonatedUser?.email || impersonatedUserId;

  const originalName =
    originalUser?.user_metadata?.full_name || originalUser?.email || "You";

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">
          Viewing as: <strong>{impersonatedName}</strong>
          <span className="font-normal"> ({impersonatedEmail})</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">
          You: <strong>{originalName}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 bg-amber-100 border-amber-600 text-amber-900 hover:bg-amber-200 hover:text-amber-950"
          onClick={stopImpersonating}
        >
          <X className="h-3 w-3 mr-1" />
          Stop
        </Button>
      </div>
    </div>
  );
}