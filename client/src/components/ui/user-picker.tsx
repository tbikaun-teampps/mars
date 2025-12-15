import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useUsersList } from "@/api/queries";
import { Skeleton } from "@/components/ui/skeleton";

interface UserPickerProps {
  value?: string;
  onValueChange: (userId: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function UserPicker({
  value,
  onValueChange,
  placeholder = "Select user...",
  disabled = false,
  className,
}: UserPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: users, isLoading } = useUsersList(
    { search: debouncedSearch || undefined, isActive: true },
    open
  );

  const selectedUser = users?.find((u) => u.user_id === value);

  const handleSelect = (userId: string) => {
    onValueChange(userId === value ? undefined : userId);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {selectedUser ? (
            <span className="truncate">
              {selectedUser.full_name || selectedUser.email || "Unknown User"}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : users && users.length > 0 ? (
            users.map((user) => (
              <div
                key={user.user_id}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === user.user_id && "bg-accent"
                )}
                onClick={() => handleSelect(user.user_id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === user.user_id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{user.full_name || "Unknown"}</span>
                  {user.email && (
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
