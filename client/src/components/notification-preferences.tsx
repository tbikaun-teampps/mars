import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/api/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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

export function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const handleToggle = async (
    key: "review_assigned" | "review_status_changed" | "comment_added",
    value: boolean
  ) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success("Preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Configure which notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NOTIFICATION_TYPES.map((type) => (
          <div key={type.key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={type.key}>{type.label}</Label>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
            <Switch
              id={type.key}
              checked={preferences?.[type.key] ?? true}
              onCheckedChange={(checked) => handleToggle(type.key, checked)}
              disabled={updatePreferences.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
