import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/api/queries";
import { LoginForm } from "@/components/login-form";
import { HexagonalBackground } from "@/components/hexagonal-bg";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LookupOptionsManager } from "@/components/settings/lookup-options-manager";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <HexagonalBackground />
          <LoginForm />
        </div>
      </div>
    );
  }

  // Check if user is admin (show loading while fetching user data)
  if (userLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="container mx-auto px-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full mt-4" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Redirect non-admin users to dashboard
  if (!currentUser?.is_admin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b px-4 py-2 z-10">
          <div className="flex justify-between container mx-auto px-4 items-center">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/app">App</BreadcrumbLink>
                  <BreadcrumbSeparator className="hidden md:block" />
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
          <main className="mx-auto px-4 container flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-muted-foreground">
                Manage application configuration and lookup options.
              </p>
            </div>

            <LookupOptionsManager />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
