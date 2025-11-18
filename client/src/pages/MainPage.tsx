import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { MaterialsTable } from "@/components/materials-table";
import { AuditLog } from "@/components/audit-log";
import { UploadSAPDialog } from "@/components/upload-sap-dialog";
import { Button } from "@/components/ui/button";
import { FerrisWheel, Upload, LayoutDashboard, ScrollText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HexagonalBackground } from "@/components/hexagonal-bg";
import { UserMenu } from "@/components/user-menu";

type View = "dashboard" | "audit-log";

export function MainPage() {
  const { user, loading, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const activeView = (searchParams.get("view") as View) || "dashboard";

  const handleLogout = async () => {
    await signOut();
  };

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FerrisWheel className="h-8 w-8" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold">MARS</h1>
              <span className="text-sm text-muted-foreground">
                Material Analysis & Review System{" "}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setSearchParams({ view: "dashboard" })}
              variant={activeView === "dashboard" ? "default" : "secondary"}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              onClick={() => setSearchParams({ view: "audit-log" })}
              variant={activeView === "audit-log" ? "default" : "secondary"}
            >
              <ScrollText className="mr-2 h-4 w-4" />
              Audit Log
            </Button>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              variant="secondary"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <UserMenu onLogout={handleLogout} />
          </div>
        </div>
      </header>
      <main className="mx-auto px-4">
        {/* Add 'container back to main className for max-w constraints, etc. */}
        {activeView === "dashboard" ? <MaterialsTable /> : <AuditLog />}
      </main>
      <UploadSAPDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
