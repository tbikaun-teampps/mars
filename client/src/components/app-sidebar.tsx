import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Command, Home, ScrollText, Upload, History, Settings } from "lucide-react";
import { NavUser } from "@/components/nav-user";
import { useCurrentUser } from "@/api/queries";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/app/dashboard",
    icon: Home,
  },
  {
    title: "Uploads",
    url: "/app/uploads",
    icon: History,
  },
  {
    title: "Audit Logs",
    url: "/app/audit-logs",
    icon: ScrollText,
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onUploadClick?: () => void;
}

export function AppSidebar({ onUploadClick, ...props }: AppSidebarProps) {
  const location = useLocation();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.is_admin ?? false;

  return (
    <Sidebar
      collapsible="none"
      className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r sticky"
      style={{
        top: "var(--banner-height, 0px)",
        height: "calc(100vh - var(--banner-height, 0px))",
      }}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-8 p-0">
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
                    isActive={location.pathname === item.url}
                    className="px-2"
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={{
                children: "Data Upload",
                hidden: false,
              }}
              className="px-2 cursor-pointer"
              onClick={onUploadClick}
            >
              <Upload />
              <span>Data Upload</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={{
                  children: "Settings",
                  hidden: false,
                }}
                isActive={location.pathname === "/app/settings"}
                className="px-2"
              >
                <Link to="/app/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
