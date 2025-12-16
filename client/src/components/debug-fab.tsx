/**
 * Debug FAB (Floating Action Button) for development mode.
 * Provides quick actions for creating/managing material reviews and user impersonation.
 */

import { useState } from "react";
import {
  Bug,
  Loader2,
  X,
  Play,
  CheckCircle,
  Clock,
  FileText,
  ChevronRight,
  UserCog,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMaterials, useMaterialDetails, useUsersList, useCurrentUser } from "@/api/queries";
import { useDebugActions, canAdvanceTo, type ReviewStatus } from "@/hooks/use-debug-actions";
import { usePermissions } from "@/hooks/use-permissions";
import { useImpersonation } from "@/contexts/ImpersonationContext";

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; icon: React.ReactNode; description: string }
> = {
  draft: {
    label: "Draft",
    icon: <FileText className="h-3 w-3" />,
    description: "Step 1 only",
  },
  pending_sme: {
    label: "Pending SME",
    icon: <Clock className="h-3 w-3" />,
    description: "Steps 1-2",
  },
  pending_decision: {
    label: "Pending Decision",
    icon: <Play className="h-3 w-3" />,
    description: "Steps 1-3",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle className="h-3 w-3" />,
    description: "All steps",
  },
};

const ALL_STATUSES: ReviewStatus[] = ["draft", "pending_sme", "pending_decision", "completed"];

export function DebugFAB() {
  const [open, setOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedUserToImpersonate, setSelectedUserToImpersonate] = useState<string>("");

  // Get admin status and impersonation context
  const { isAdmin } = usePermissions();
  const { impersonatedUserId, isImpersonating, startImpersonating, stopImpersonating } =
    useImpersonation();

  // Get current user to filter from impersonation list
  const { data: currentUser } = useCurrentUser();

  // Fetch users for impersonation (only when popover is open and user is admin)
  const { data: usersData, isLoading: usersLoading } = useUsersList(
    { isActive: true },
    open && isAdmin && !isImpersonating
  );

  // Filter out the current user from impersonation list
  const users = usersData?.filter((u) => u.user_id !== currentUser?.id);

  // Fetch materials for the picker (limit to first 100 for performance)
  const { data: materialsData, isLoading: materialsLoading } = useMaterials({
    limit: 100,
    sort_by: "material_number",
    sort_order: "asc",
  });

  // Fetch details for selected material to show current status
  const materialNumber = selectedMaterial ? parseInt(selectedMaterial, 10) : null;
  const { data: materialDetails } = useMaterialDetails(materialNumber);

  const { createAtStatus, advanceToStatus, cancelReview, isCreating, isAdvancing, isCancelling } =
    useDebugActions();

  const materials = materialsData?.items || [];

  // Find impersonated user info
  const impersonatedUser = users?.find((u) => u.user_id === impersonatedUserId);

  // Find active review (not completed or cancelled)
  const activeReview = materialDetails?.reviews?.find(
    (r) => r.status !== "completed" && r.status !== "cancelled"
  );

  const currentStatus = activeReview?.status ?? null;

  const handleStatusAction = async (targetStatus: ReviewStatus) => {
    if (!materialNumber) {
      toast.error("Please select a material first");
      return;
    }

    try {
      if (!activeReview) {
        // No active review - create new one
        await createAtStatus.mutateAsync({
          materialNumber,
          targetStatus,
        });
        toast.success(`Created review at status: ${STATUS_CONFIG[targetStatus].label}`);
      } else {
        // Advance existing review
        await advanceToStatus.mutateAsync({
          materialNumber,
          reviewId: activeReview.review_id!,
          currentStatus: activeReview.status,
          targetStatus,
        });
        toast.success(`Advanced review to: ${STATUS_CONFIG[targetStatus].label}`);
      }
    } catch (error) {
      toast.error(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleCancelReview = async () => {
    if (!materialNumber || !activeReview) {
      toast.error("No active review to cancel");
      return;
    }

    try {
      await cancelReview.mutateAsync({
        materialNumber,
        reviewId: activeReview.review_id!,
      });
      toast.success("Review cancelled");
    } catch (error) {
      toast.error(
        `Failed to cancel review: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const isLoading = isCreating || isAdvancing || isCancelling;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="fixed top-1/2 -translate-y-1/2 right-4 z-[100] h-12 w-12 rounded-full shadow-lg"
          variant="default"
        >
          <Bug className="h-5 w-5" />
          <span className="sr-only">Debug Actions</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="center"
        className="w-80"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Debug Actions</h4>
            <Badge variant="secondary" className="text-xs">
              Dev Only
            </Badge>
          </div>

          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reviews" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs" disabled={!isAdmin}>
                <UserCog className="h-3 w-3 mr-1" />
                Users
                {isImpersonating && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-3 mt-3">
              {/* Material Selector */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Select Material
                </label>
                <div className="h-32 rounded-md border overflow-y-auto">
                  <div className="p-1">
                    {materialsLoading ? (
                      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : materials.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No materials found
                      </div>
                    ) : (
                      materials.map((m) => (
                        <button
                          key={m.material_number}
                          type="button"
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors ${
                            selectedMaterial === m.material_number.toString()
                              ? "bg-accent font-medium"
                              : ""
                          }`}
                          onClick={() => setSelectedMaterial(m.material_number.toString())}
                        >
                          #{m.material_number} - {m.material_desc?.slice(0, 25) || "No description"}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Current Status */}
              {selectedMaterial && (
                <div className="rounded-md bg-muted p-2 text-xs">
                  <span className="text-muted-foreground">Current Status: </span>
                  {activeReview ? (
                    <Badge variant="outline" className="ml-1">
                      {activeReview.status}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">No active review</span>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {activeReview ? "Advance To Status" : "Create Review At Status"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map((status) => {
                    const config = STATUS_CONFIG[status];
                    const canUse = canAdvanceTo(currentStatus, status);
                    const isCurrent = currentStatus === status;

                    return (
                      <Button
                        key={status}
                        variant={isCurrent ? "secondary" : "outline"}
                        size="sm"
                        className="h-auto py-2 flex-col items-start"
                        disabled={isLoading || !selectedMaterial || !canUse || isCurrent}
                        onClick={() => handleStatusAction(status)}
                      >
                        <span className="flex items-center gap-1 text-xs font-medium">
                          {config.icon}
                          {config.label}
                          {canUse && !isCurrent && activeReview && (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {isCurrent ? "Current" : config.description}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Cancel Action */}
              {activeReview && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={isLoading}
                  onClick={handleCancelReview}
                >
                  {isCancelling ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <X className="mr-2 h-3 w-3" />
                  )}
                  Cancel Active Review
                </Button>
              )}

              {/* Loading Indicator */}
              {(isCreating || isAdvancing) && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {isCreating ? "Creating review..." : "Advancing review..."}
                </div>
              )}
            </TabsContent>

            {/* Users Tab (Admin Only) */}
            <TabsContent value="users" className="space-y-3 mt-3">
              {!isAdmin ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Admin access required
                </div>
              ) : isImpersonating ? (
                // Show current impersonation status
                <div className="space-y-3">
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs">
                    <span className="text-amber-800">
                      Currently viewing as:{" "}
                      <strong>
                        {impersonatedUser?.full_name || impersonatedUser?.email || impersonatedUserId}
                      </strong>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      stopImpersonating();
                      toast.success("Stopped impersonating");
                    }}
                  >
                    <LogOut className="mr-2 h-3 w-3" />
                    Stop Impersonating
                  </Button>
                </div>
              ) : (
                // Show user picker
                <div className="space-y-3">
                  <label className="text-xs text-muted-foreground">
                    Select user to impersonate
                  </label>
                  <div className="h-40 rounded-md border overflow-y-auto">
                    <div className="p-1">
                      {usersLoading ? (
                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                          Loading users...
                        </div>
                      ) : !users || users.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No users found
                        </div>
                      ) : (
                        users.map((user) => (
                          <button
                            key={user.user_id}
                            type="button"
                            className={`w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors ${
                              selectedUserToImpersonate === user.user_id
                                ? "bg-accent font-medium"
                                : ""
                            }`}
                            onClick={() => setSelectedUserToImpersonate(user.user_id)}
                          >
                            <div className="truncate">
                              {user.full_name || "Unknown"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={!selectedUserToImpersonate}
                    onClick={() => {
                      if (selectedUserToImpersonate) {
                        startImpersonating(selectedUserToImpersonate);
                        const user = users?.find((u) => u.user_id === selectedUserToImpersonate);
                        toast.success(
                          `Now viewing as: ${user?.full_name || user?.email || selectedUserToImpersonate}`
                        );
                        setSelectedUserToImpersonate("");
                      }
                    }}
                  >
                    <UserCog className="mr-2 h-3 w-3" />
                    Impersonate User
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
