import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/login-form";
import { HexagonalBackground } from "@/components/hexagonal-bg";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UploadSAPDialog } from "@/components/upload-sap-dialog";
import { DebugFAB } from "@/components/debug-fab";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  headerRight?: React.ReactNode;
}

export function AppLayout({ children, breadcrumbs, headerRight }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
      <SidebarProvider>
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
              {headerRight}
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
            <main className="mx-auto px-4 container flex-1">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <UploadSAPDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
      {import.meta.env.DEV && <DebugFAB />}
    </>
  );
}
