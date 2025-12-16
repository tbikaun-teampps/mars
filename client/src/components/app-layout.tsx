import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/login-form";
import { HexagonalBackground } from "@/components/hexagonal-bg";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UploadDataDialog } from "@/components/upload-data-dialog";
import { DebugFAB } from "@/components/debug-fab";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePermissions } from "@/hooks/use-permissions";
import { useDashboardSummary } from "@/api/queries";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Height of the impersonation banner (py-2 + h-7 button = ~40px)
const BANNER_HEIGHT = "2.5rem";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function AppLayout({ children, breadcrumbs }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { isImpersonating } = useImpersonation();
  const { isAdmin } = usePermissions();
  const { data: dashboardSummary } = useDashboardSummary(true);

  // Calculate banner height for sidebar offset
  const bannerHeight = import.meta.env.DEV && isImpersonating ? BANNER_HEIGHT : "0px";

  // Show loading state while checking auth
  if (loading) {
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

  return (
    <>
      {import.meta.env.DEV && <ImpersonationBanner />}
      <SidebarProvider bannerHeight={bannerHeight}>
        <AppSidebar onUploadClick={() => setUploadDialogOpen(true)} />
        <SidebarInset>
          <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b px-4 py-2 z-10">
            <div className="flex justify-between container mx-auto px-4 items-center">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs?.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <BreadcrumbItem key={index}>
                        {isLast ? (
                          <BreadcrumbPage className="capitalize">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <>
                            <BreadcrumbLink
                              href={crumb.href}
                              className="capitalize"
                            >
                              {crumb.label}
                            </BreadcrumbLink>
                            <BreadcrumbSeparator className="hidden md:block" />
                          </>
                        )}
                      </BreadcrumbItem>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              <Badge variant="secondary">
                Last Upload:{" "}
                {dashboardSummary?.last_upload_date
                  ? `${new Date(dashboardSummary.last_upload_date).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} (${formatDistanceToNow(new Date(dashboardSummary.last_upload_date), { addSuffix: true })})`
                  : "No data uploaded"}
              </Badge>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
            <main className="mx-auto px-4 container flex-1">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <UploadDataDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
      {import.meta.env.DEV && isAdmin && <DebugFAB />}
    </>
  );
}
