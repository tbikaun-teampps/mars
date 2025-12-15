import * as React from "react";
import { useRoles, useRole } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  ChevronRight,
  Shield,
  Users,
  Settings,
  Briefcase,
} from "lucide-react";

const ROLE_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "workflow", label: "Workflow" },
  { value: "sme", label: "SME" },
  { value: "approval", label: "Approval" },
  { value: "admin", label: "Admin" },
];

const ROLE_TYPE_ICONS: Record<string, React.ReactNode> = {
  workflow: <Briefcase className="h-4 w-4" />,
  sme: <Users className="h-4 w-4" />,
  approval: <Check className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
};

const ROLE_TYPE_COLORS: Record<string, string> = {
  workflow: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  sme: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  approval: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const PERMISSION_LABELS: Record<string, string> = {
  can_create_reviews: "Create Reviews",
  can_edit_reviews: "Edit Reviews",
  can_delete_reviews: "Delete Reviews",
  can_approve_reviews: "Approve Reviews",
  can_provide_sme_review: "Provide SME Review",
  can_assign_reviews: "Assign Reviews",
  can_manage_users: "Manage Users",
  can_manage_settings: "Manage Settings",
  can_view_all_reviews: "View All Reviews",
  can_export_data: "Export Data",
  can_manage_acknowledgements: "Manage Acknowledgements",
};

export function RolesList() {
  const [showInactive, setShowInactive] = React.useState(false);
  const [roleTypeFilter, setRoleTypeFilter] = React.useState("all");
  const [selectedRoleId, setSelectedRoleId] = React.useState<number | null>(
    null
  );

  const { data: roles, isLoading } = useRoles({
    includeInactive: showInactive,
    roleType: roleTypeFilter === "all" ? undefined : roleTypeFilter,
  });

  const { data: selectedRole, isLoading: roleLoading } = useRole(
    selectedRoleId,
    selectedRoleId !== null
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>System roles and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            System roles and their permissions (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-4">
              <Select value={roleTypeFilter} onValueChange={setRoleTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive">Show inactive</Label>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Role</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <TableRow
                      key={role.role_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRoleId(role.role_id)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.role_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {role.role_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ROLE_TYPE_COLORS[role.role_type] || ""}
                        >
                          <span className="mr-1">
                            {ROLE_TYPE_ICONS[role.role_type]}
                          </span>
                          {role.role_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        {role.is_active ? (
                          <Badge variant="outline" className="bg-green-50">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No roles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Details Dialog */}
      <Dialog
        open={selectedRoleId !== null}
        onOpenChange={(open) => !open && setSelectedRoleId(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRole && ROLE_TYPE_ICONS[selectedRole.role_type]}
              {selectedRole?.role_name || "Role Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.description || "No description available"}
            </DialogDescription>
          </DialogHeader>

          {roleLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedRole ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={ROLE_TYPE_COLORS[selectedRole.role_type] || ""}
                >
                  {selectedRole.role_type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedRole.role_code}
                </span>
                {selectedRole.approval_limit && (
                  <Badge variant="secondary">
                    Approval limit: $
                    {selectedRole.approval_limit.toLocaleString()}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Permissions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                    const hasPermission =
                      selectedRole[key as keyof typeof selectedRole];
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2 text-sm rounded-md p-2 ${
                          hasPermission
                            ? "bg-green-50 dark:bg-green-950"
                            : "bg-muted/50"
                        }`}
                      >
                        {hasPermission ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={
                            hasPermission ? "" : "text-muted-foreground"
                          }
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
