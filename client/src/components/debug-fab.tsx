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
  Bell,
  CheckCheck,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useMaterials,
  useMaterialDetails,
  useUsersList,
  useCurrentUser,
  useNotifications,
  useUnreadNotificationCount,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useCreateDebugNotification,
} from "@/api/queries";
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

const NOTIFICATION_TYPES = [
  { value: "review_assigned", label: "Review Assigned" },
  { value: "review_status_changed", label: "Status Changed" },
  { value: "comment_added", label: "Comment Added" },
] as const;

export function DebugFAB() {
  const [open, setOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedUserToImpersonate, setSelectedUserToImpersonate] = useState<string>("");
  const [selectedNotificationType, setSelectedNotificationType] = useState<string>("review_assigned");
  const [selectedNotificationMaterial, setSelectedNotificationMaterial] = useState<string>("");

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

  // Notification hooks
  const { data: unreadCountData } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications(
    { limit: 10 },
    open
  );
  const markAllRead = useMarkAllNotificationsRead();
  const { data: preferences, isLoading: preferencesLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const createDebugNotification = useCreateDebugNotification();

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

  const handleCreateTestNotification = async () => {
    try {
      const materialNum = selectedNotificationMaterial ? parseInt(selectedNotificationMaterial, 10) : undefined;
      await createDebugNotification.mutateAsync({
        notification_type: selectedNotificationType as "review_assigned" | "review_status_changed" | "comment_added",
        material_number: materialNum,
      });
      const typeLabel = selectedNotificationType.replace(/_/g, " ");
      const materialLabel = materialNum ? ` for material #${materialNum}` : "";
      toast.success(`Created test notification: ${typeLabel}${materialLabel}`);
    } catch (error) {
      toast.error(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleTogglePreference = async (
    key: "review_assigned" | "review_status_changed" | "comment_added",
    value: boolean
  ) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success("Preference updated");
    } catch {
      toast.error("Failed to update preference");
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
            <TabsList className="grid w-full grid-cols-3">
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
              <TabsTrigger value="notifications" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Notifs
                {(unreadCountData?.unread_count ?? 0) > 0 && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-red-500" />
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

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-3 mt-3">
              {/* Unread Count */}
              <div className="rounded-md bg-muted p-2 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">
                  Unread: <strong>{unreadCountData?.unread_count ?? 0}</strong>
                </span>
                {(unreadCountData?.unread_count ?? 0) > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      markAllRead.mutate();
                      toast.success("All notifications marked as read");
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark All Read
                  </Button>
                )}
              </div>

              {/* Recent Notifications List */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Recent Notifications
                </label>
                <div className="h-28 rounded-md border overflow-y-auto">
                  <div className="p-1">
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : !notificationsData?.items.length ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No notifications
                      </div>
                    ) : (
                      notificationsData.items.map((n) => (
                        <div
                          key={n.notification_id}
                          className={`px-2 py-1.5 text-xs rounded-sm ${
                            !n.is_read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <div className="font-medium truncate">{n.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {n.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Create Test Notification */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Attach to material (optional)
                </label>
                <div className="h-20 rounded-md border overflow-y-auto">
                  <div className="p-1">
                    <button
                      type="button"
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors ${
                        selectedNotificationMaterial === ""
                          ? "bg-accent font-medium"
                          : ""
                      }`}
                      onClick={() => setSelectedNotificationMaterial("")}
                    >
                      No material
                    </button>
                    {materialsLoading ? (
                      <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : (
                      materials.map((m) => (
                        <button
                          key={m.material_number}
                          type="button"
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors ${
                            selectedNotificationMaterial === m.material_number.toString()
                              ? "bg-accent font-medium"
                              : ""
                          }`}
                          onClick={() => setSelectedNotificationMaterial(m.material_number.toString())}
                        >
                          #{m.material_number} - {m.material_desc?.slice(0, 20) || "No description"}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Select notification type
                </label>
                <div className="h-20 rounded-md border overflow-y-auto">
                  <div className="p-1">
                    {NOTIFICATION_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors ${
                          selectedNotificationType === type.value
                            ? "bg-accent font-medium"
                            : ""
                        }`}
                        onClick={() => setSelectedNotificationType(type.value)}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleCreateTestNotification}
                  disabled={createDebugNotification.isPending}
                >
                  {createDebugNotification.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-3 w-3 mr-2" />
                  )}
                  Create Test Notification
                </Button>
              </div>

              {/* Notification Preferences */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Preferences
                </label>
                {preferencesLoading ? (
                  <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {NOTIFICATION_TYPES.map((type) => (
                      <div
                        key={type.value}
                        className="flex items-center justify-between text-xs"
                      >
                        <Label htmlFor={`pref-${type.value}`} className="text-xs cursor-pointer">
                          {type.label}
                        </Label>
                        <Switch
                          id={`pref-${type.value}`}
                          checked={preferences?.[type.value as keyof typeof preferences] ?? true}
                          onCheckedChange={(checked) =>
                            handleTogglePreference(
                              type.value as "review_assigned" | "review_status_changed" | "comment_added",
                              checked
                            )
                          }
                          disabled={updatePreferences.isPending}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
