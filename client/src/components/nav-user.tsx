import { Bell, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getVersionInfo } from "@/lib/version";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/api/queries";
import { Skeleton } from "./ui/skeleton";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { displayVersion } = getVersionInfo();

  const { user, loading: authLoading, signOut } = useAuth();
  // Use API profile for display (respects impersonation)
  const { data: profile, isLoading: profileLoading } = useCurrentUser();

  // Prefer profile data (impersonation-aware) over Supabase user metadata
  const userName =
    profile?.display_name ||
    profile?.full_name ||
    (user?.user_metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "User";
  const userEmail = profile?.email || user?.email || "user@example.com";
  const userAvatar = (user?.user_metadata?.avatar as string) || "/avatars/demo-user.png";

  const handleLogout = async () => {
    await signOut();
  };

  if (authLoading || profileLoading) {
    return <Skeleton className="h-8 w-full rounded-lg bg-sidebar-primary/10" />;
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <SidebarMenuButton
              tooltip={{
                children: `Logged in as: ${userName} (${userEmail})`,
                hidden: false,
              }}
              className="cursor-pointer m-0 p-0"
            >
              <Avatar className="rounded-sm bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-80">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="rounded-sm text-sm bg-sidebar-primary text-sidebar-primary-foreground">
                  {userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="rounded-lg">
                    {userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/app/account">
                  <User />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
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
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
