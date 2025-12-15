import * as React from "react";
import {
  useUserRoles,
  useRoles,
  useCreateUserRole,
  useUpdateUserRole,
  useDeleteUserRole,
} from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { UserPicker } from "@/components/ui/user-picker";

interface UserRoleFormData {
  user_id: string;
  role_id: number | null;
  valid_from: string;
  valid_to: string;
}

const DEFAULT_FORM_DATA: UserRoleFormData = {
  user_id: "",
  role_id: null,
  valid_from: "",
  valid_to: "",
};

export function UserRoleManager() {
  const [showInactive, setShowInactive] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<{
    user_role_id: number;
  } | null>(null);
  const [formData, setFormData] =
    React.useState<UserRoleFormData>(DEFAULT_FORM_DATA);

  const { data: userRoles, isLoading } = useUserRoles({
    includeInactive: showInactive,
  });
  const { data: roles } = useRoles();

  const createMutation = useCreateUserRole();
  const updateMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUserRole();

  const handleCreate = async () => {
    if (!formData.user_id || !formData.role_id) {
      toast.error("User and Role are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        user_id: formData.user_id,
        role_id: formData.role_id,
        valid_from: formData.valid_from || undefined,
        valid_to: formData.valid_to || undefined,
      });
      toast.success("Role assigned successfully");
      setIsAddDialogOpen(false);
      setFormData(DEFAULT_FORM_DATA);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign role"
      );
    }
  };

  const handleUpdate = async () => {
    if (!editingAssignment) return;

    try {
      await updateMutation.mutateAsync({
        userRoleId: editingAssignment.user_role_id,
        data: {
          valid_from: formData.valid_from || undefined,
          valid_to: formData.valid_to || undefined,
        },
      });
      toast.success("Assignment updated successfully");
      setEditingAssignment(null);
      setFormData(DEFAULT_FORM_DATA);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update assignment"
      );
    }
  };

  const handleRevoke = async (userRoleId: number) => {
    if (!confirm("Are you sure you want to revoke this role assignment?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(userRoleId);
      toast.success("Role revoked successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke role"
      );
    }
  };

  const openEditDialog = (assignment: {
    user_role_id: number;
    valid_from?: string | null;
    valid_to?: string | null;
  }) => {
    setEditingAssignment({ user_role_id: assignment.user_role_id });
    setFormData({
      user_id: "",
      role_id: null,
      valid_from: assignment.valid_from || "",
      valid_to: assignment.valid_to || "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Role Assignments</CardTitle>
          <CardDescription>
            Manage user role assignments and permissions
          </CardDescription>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Manage user role assignments and permissions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive-roles"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive-roles">Show revoked</Label>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid To</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles && userRoles.length > 0 ? (
                  userRoles.map((assignment) => (
                    <TableRow
                      key={assignment.user_role_id}
                      className={!assignment.is_active ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {assignment.user_name || "Unknown"}
                          </span>
                          {assignment.user_email && (
                            <span className="text-xs text-muted-foreground">
                              {assignment.user_email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{assignment.role_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {assignment.role_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.valid_from
                          ? format(new Date(assignment.valid_from), "PP")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {assignment.valid_to
                          ? format(new Date(assignment.valid_to), "PP")
                          : "Indefinite"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs">
                            {format(new Date(assignment.assigned_at), "PP")}
                          </span>
                          {assignment.assigned_by_name && (
                            <span className="text-xs text-muted-foreground">
                              by {assignment.assigned_by_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.is_active ? (
                          <Badge variant="outline" className="bg-green-50">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.is_active && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(assignment)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Dates
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  handleRevoke(assignment.user_role_id)
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Revoke
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No role assignments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Assignment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to a user. You can only assign roles with
              permissions you have.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <UserPicker
                value={formData.user_id}
                onValueChange={(userId) =>
                  setFormData((prev) => ({ ...prev, user_id: userId || "" }))
                }
                placeholder="Select a user..."
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formData.role_id?.toString() || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    role_id: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem
                      key={role.role_id}
                      value={role.role_id.toString()}
                    >
                      <div className="flex items-center gap-2">
                        <span>{role.role_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {role.role_type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valid_from: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valid To</Label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valid_to: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormData(DEFAULT_FORM_DATA);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Assigning..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog
        open={editingAssignment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAssignment(null);
            setFormData(DEFAULT_FORM_DATA);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the validity period for this role assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valid_from: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valid To</Label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valid_to: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingAssignment(null);
                setFormData(DEFAULT_FORM_DATA);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
