import { useCurrentUser } from "@/api/queries";
import { AppLayout } from "@/components/app-layout";
import { LookupOptionsManager } from "@/components/settings/lookup-options-manager";
import { RolesList } from "@/components/settings/roles-list";
import { UserRoleManager } from "@/components/settings/user-role-manager";
import { SMEExpertiseManager } from "@/components/settings/sme-expertise-manager";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          Manage application configuration.
        </p>
      </div>

      <Tabs defaultValue="lookups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lookups">Lookup Options</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="user-roles">User Roles</TabsTrigger>
          <TabsTrigger value="sme-expertise">SME Expertise</TabsTrigger>
        </TabsList>

        <TabsContent value="lookups">
          <LookupOptionsManager />
        </TabsContent>

        <TabsContent value="roles">
          <RolesList />
        </TabsContent>

        <TabsContent value="user-roles">
          <UserRoleManager />
        </TabsContent>

        <TabsContent value="sme-expertise">
          <SMEExpertiseManager />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
