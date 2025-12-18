import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUsersByPermission } from "@/api/queries";

interface UserPickerByPermissionProps {
  permission: "can_provide_sme_review" | "can_approve_reviews";
  groupByExpertise: boolean;
  value?: string;
  onChange: (userId: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UserPickerByPermission({
  permission,
  groupByExpertise,
  value,
  onChange,
  placeholder = "Select user...",
  disabled = false,
}: UserPickerByPermissionProps) {
  const [open, setOpen] = React.useState(false);
  const { data: users, isLoading } = useUsersByPermission(permission);

  // Group users by SME type if requested
  const groupedUsers = React.useMemo(() => {
    if (!users || users.length === 0) return [];

    if (!groupByExpertise) {
      // Dedupe users by user_id when not grouping
      const uniqueUsers = users.filter(
        (user, index, self) =>
          index === self.findIndex((u) => u.user_id === user.user_id)
      );
      return [{ group: "Users", users: uniqueUsers }];
    }

    // Group by sme_type
    const groups = new Map<string, typeof users>();
    for (const user of users) {
      const key = user.sme_type ?? "Other";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(user);
    }

    // Sort groups alphabetically, with "Other" last
    const sortedGroups = Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return a.localeCompare(b);
      })
      .map(([group, users]) => ({ group, users }));

    return sortedGroups;
  }, [users, groupByExpertise]);

  // Find the selected user from the flat list
  const selectedUser = React.useMemo(() => {
    if (!users || !value) return null;
    return users.find((u) => u.user_id === value);
  }, [users, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : selectedUser ? (
            selectedUser.full_name
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            {groupedUsers.map(({ group, users: groupUsers }) => (
              <CommandGroup key={group} heading={group}>
                {groupUsers.map((user) => (
                  <CommandItem
                    key={`${user.user_id}-${user.sme_type ?? "default"}`}
                    value={`${user.full_name} ${user.email ?? ""}`}
                    onSelect={() => {
                      onChange(user.user_id === value ? undefined : user.user_id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === user.user_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{user.full_name}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
