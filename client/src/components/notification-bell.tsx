import { useState } from "react";
import { Bell, BellOff, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/api/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { components } from "@/types/api";

type NotificationResponse = components["schemas"]["NotificationResponse"];

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationResponse;
  onMarkRead: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer",
        !notification.is_read && "bg-blue-50 dark:bg-blue-950/20"
      )}
      onClick={onMarkRead}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </span>
          {notification.triggered_by_user && (
            <span className="text-xs text-muted-foreground">
              by {notification.triggered_by_user.full_name}
            </span>
          )}
        </div>
      </div>
      {notification.review_id && notification.material_number && (
        <Link
          to={`/app/dashboard?material=${notification.material_number}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: countData } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications(
    { limit: 10 },
    open // Only fetch when dropdown is open
  );
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = countData?.unread_count ?? 0;

  const handleMarkRead = (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(notificationId);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notificationsData?.items.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <BellOff className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                No notifications
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You're all caught up
              </p>
            </div>
          ) : (
            notificationsData?.items.map((notification) => (
              <NotificationItem
                key={notification.notification_id}
                notification={notification}
                onMarkRead={() =>
                  handleMarkRead(
                    notification.notification_id,
                    notification.is_read
                  )
                }
              />
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/app/account"
            className="w-full text-center justify-center cursor-pointer"
          >
            Notification Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
