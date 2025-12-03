import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { MaterialsTable } from "@/components/materials-table";
import { AuditLog } from "@/components/audit-log";
import { UploadSAPDialog } from "@/components/upload-sap-dialog";
import { Button } from "@/components/ui/button";
import { Upload, LayoutDashboard, ScrollText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HexagonalBackground } from "@/components/hexagonal-bg";
import { UserMenu } from "@/components/user-menu";
import { getVersionInfo } from "@/lib/version";
import {
  ReviewModeProvider,
  useReviewMode,
} from "@/contexts/ReviewModeContext";
import { REVIEW_MODES, REVIEW_MODE_CONFIGS } from "@/lib/review-modes";
import { cn } from "@/lib/utils";

type View = "dashboard" | "audit-log";

function ReviewModeSelector() {
  const { selectedMode, setSelectedMode } = useReviewMode();

  return (
    <div className="flex gap-1 border-l border-r px-2 mx-2">
      {REVIEW_MODES.map((mode) => {
        const config = REVIEW_MODE_CONFIGS[mode];
        const Icon = config.icon;
        const isActive = selectedMode === mode;

        return (
          <Button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-1.5",
              isActive && config.color.bg,
              isActive && config.color.text,
              isActive && "hover:opacity-90"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">
              {config.label.replace(" Review", "")}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

export function MainPage() {
  const { user, loading, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const activeView = (searchParams.get("view") as View) || "dashboard";
  const { displayVersion } = getVersionInfo();

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
    <ReviewModeProvider>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="border-b shrink-0">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <div className="flex">
                  <h1
                    className="text-xl font-bold bg-gradient-to-r from-[#eb59ff] to-[#032a83] bg-clip-text text-transparent hover:from-[#f472b6] hover:to-[#1e40af] transition-all duration-300"
                  >
                    MARS
                  </h1>
                </div>
                <span className="text-xs text-muted-foreground">
                  Material Analysis & Review System{" "}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <ReviewModeSelector />
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
        <main className="mx-auto px-4 container flex-1 overflow-auto">
          {/* Add 'container back to main className for max-w constraints, etc. */}
          {activeView === "dashboard" ? <MaterialsTable /> : <AuditLog />}
        </main>
        <footer className="border-t shrink-0 w-full py-2 flex justify-center items-center">
          <p className="text-gray-400 text-xs">
            {/* #eb59ff to  #032a83*/}
            Built by{" "}
            <a
              href="https://www.teampps.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-[#eb59ff] to-[#032a83] bg-clip-text text-transparent hover:from-[#f472b6] hover:to-[#1e40af] transition-all duration-300"
            >
              TEAM
            </a>{" "}
            • {displayVersion}
          </p>
        </footer>
        <UploadSAPDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
        />
      </div>
    </ReviewModeProvider>
  );
}
