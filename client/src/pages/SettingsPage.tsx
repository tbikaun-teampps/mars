import { useCurrentUser } from "@/api/queries";
import { AppLayout } from "@/components/app-layout";
import { LookupOptionsManager } from "@/components/settings/lookup-options-manager";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const breadcrumbs = [
    { label: "App", href: "/app" },
    { label: "Settings" },
  ];

  // Show loading state while fetching user data (auth already handled by AppLayout)
  if (userLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </AppLayout>
    );
  }

  // Redirect non-admin users to dashboard
  if (!currentUser?.is_admin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage application configuration and lookup options.
        </p>
      </div>

      <LookupOptionsManager />
    </AppLayout>
  );
}
