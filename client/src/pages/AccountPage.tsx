import { useState } from "react";
import {
  useCurrentUser,
  useUserRoles,
  useUpdateProfile,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/api/queries";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Building2,
  MapPin,
  Phone,
  Briefcase,
  Shield,
  Key,
  Bell,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_TYPES = [
  {
    key: "review_assigned" as const,
    label: "Review Assigned",
    description: "Get notified when a review is assigned to you",
  },
  {
    key: "review_status_changed" as const,
    label: "Status Changes",
    description:
      "Get notified when review status changes for reviews you're involved in",
  },
  {
    key: "comment_added" as const,
    label: "New Comments",
    description:
      "Get notified when someone comments on reviews you're involved in",
  },
];

export function AccountPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles(
    { userId: currentUser?.id, includeInactive: false },
    !!currentUser?.id
  );
  const updateProfile = useUpdateProfile();
  const { data: notificationPrefs, isLoading: prefsLoading } =
    useNotificationPreferences();
  const updateNotificationPrefs = useUpdateNotificationPreferences();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const breadcrumbs = [
    { label: "App", href: "/app" },
    { label: "Account" },
  ];

  const handleOpenEditProfile = () => {
    setEditDisplayName(currentUser?.display_name || "");
    setEditPhone(currentUser?.phone || "");
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: editDisplayName || null,
        phone: editPhone || null,
      });
      toast.success("Profile updated successfully");
      setEditProfileOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    }
  };

  const handleNotificationToggle = async (
    key: "review_assigned" | "review_status_changed" | "comment_added",
    value: boolean
  ) => {
    try {
      await updateNotificationPrefs.mutateAsync({ [key]: value });
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update notification preferences");
    }
  };

  if (userLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground">
          View and manage your profile, roles, and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditProfile}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
            <CardDescription>
              Your account details and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileField
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={currentUser?.email}
            />
            <ProfileField
              icon={<User className="h-4 w-4" />}
              label="Full Name"
              value={currentUser?.full_name}
            />
            <ProfileField
              icon={<User className="h-4 w-4" />}
              label="Display Name"
              value={currentUser?.display_name}
            />
            <ProfileField
              icon={<Briefcase className="h-4 w-4" />}
              label="Job Title"
              value={currentUser?.job_title}
            />
            <ProfileField
              icon={<Building2 className="h-4 w-4" />}
              label="Department"
              value={currentUser?.department}
            />
            <ProfileField
              icon={<MapPin className="h-4 w-4" />}
              label="Site"
              value={currentUser?.site}
            />
            <ProfileField
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              value={currentUser?.phone}
            />
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure which notifications you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {prefsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                      <Skeleton className="h-6 w-10 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                NOTIFICATION_TYPES.map((type) => (
                  <div
                    key={type.key}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <Label htmlFor={type.key}>{type.label}</Label>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                    <Switch
                      id={type.key}
                      checked={notificationPrefs?.[type.key] ?? true}
                      onCheckedChange={(checked) =>
                        handleNotificationToggle(type.key, checked)
                      }
                      disabled={updateNotificationPrefs.isPending}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Assigned Roles
              </CardTitle>
              <CardDescription>
                Roles that have been assigned to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-28" />
                </div>
              ) : userRoles && userRoles.length > 0 ? (
                <div className="space-y-3">
                  {userRoles.map((role) => (
                    <div
                      key={role.user_role_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{role.role_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {role.role_type}
                        </p>
                      </div>
                      <Badge
                        variant={role.is_active ? "default" : "secondary"}
                      >
                        {role.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No roles assigned.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Permissions
              </CardTitle>
              <CardDescription>
                Your current permissions based on assigned roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser?.permissions && currentUser.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentUser.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No permissions assigned.
                </p>
              )}
              {currentUser?.is_admin && (
                <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      Administrator
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have full administrative access.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name and phone number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditProfileOpen(false)}
              disabled={updateProfile.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}

function ProfileField({ icon, label, value }: ProfileFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium truncate">
          {value || <span className="text-muted-foreground italic">Not set</span>}
        </p>
      </div>
    </div>
  );
}
