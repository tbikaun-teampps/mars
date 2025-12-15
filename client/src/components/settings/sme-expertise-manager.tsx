import * as React from "react";
import {
  useSMEExpertise,
  useLookupOptions,
  useCreateSMEExpertise,
  useUpdateSMEExpertise,
  useDeleteSMEExpertise,
} from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { MoreHorizontal, Pencil, Trash2, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { UserPicker } from "@/components/ui/user-picker";

interface SMEFormData {
  user_id: string;
  sme_type: string;
  material_group: string;
  plant: string;
  max_concurrent_reviews: number;
  is_available: boolean;
  unavailable_until: string;
  unavailable_reason: string;
  backup_user_id: string;
}

const DEFAULT_FORM_DATA: SMEFormData = {
  user_id: "",
  sme_type: "",
  material_group: "",
  plant: "",
  max_concurrent_reviews: 10,
  is_available: true,
  unavailable_until: "",
  unavailable_reason: "",
  backup_user_id: "",
};

export function SMEExpertiseManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingExpertise, setEditingExpertise] = React.useState<{
    expertise_id: number;
  } | null>(null);
  const [formData, setFormData] = React.useState<SMEFormData>(DEFAULT_FORM_DATA);

  const { data: smeExpertise, isLoading } = useSMEExpertise();
  const { data: smeTypeLookup } = useLookupOptions("sme_type", false, true);

  const createMutation = useCreateSMEExpertise();
  const updateMutation = useUpdateSMEExpertise();
  const deleteMutation = useDeleteSMEExpertise();

  const smeTypeOptions = smeTypeLookup?.options || [];

  const handleCreate = async () => {
    if (!formData.user_id || !formData.sme_type) {
      toast.error("User and SME Type are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        user_id: formData.user_id,
        sme_type: formData.sme_type,
        material_group: formData.material_group || undefined,
        plant: formData.plant || undefined,
        max_concurrent_reviews: formData.max_concurrent_reviews,
        backup_user_id: formData.backup_user_id || undefined,
      });
      toast.success("SME expertise added successfully");
      setIsAddDialogOpen(false);
      setFormData(DEFAULT_FORM_DATA);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add SME expertise"
      );
    }
  };

  const handleUpdate = async () => {
    if (!editingExpertise) return;

    try {
      await updateMutation.mutateAsync({
        expertiseId: editingExpertise.expertise_id,
        data: {
          sme_type: formData.sme_type || undefined,
          material_group: formData.material_group || undefined,
          plant: formData.plant || undefined,
          max_concurrent_reviews: formData.max_concurrent_reviews,
          is_available: formData.is_available,
          unavailable_until: formData.unavailable_until || undefined,
          unavailable_reason: formData.unavailable_reason || undefined,
          backup_user_id: formData.backup_user_id || undefined,
        },
      });
      toast.success("SME expertise updated successfully");
      setEditingExpertise(null);
      setFormData(DEFAULT_FORM_DATA);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update SME expertise"
      );
    }
  };

  const handleDelete = async (expertiseId: number) => {
    if (!confirm("Are you sure you want to delete this SME expertise?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(expertiseId);
      toast.success("SME expertise deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete SME expertise"
      );
    }
  };

  const openEditDialog = (expertise: {
    expertise_id: number;
    sme_type: string;
    material_group?: string | null;
    plant?: string | null;
    max_concurrent_reviews: number;
    is_available: boolean;
    unavailable_until?: string | null;
    unavailable_reason?: string | null;
    backup_user_id?: string | null;
  }) => {
    setEditingExpertise({ expertise_id: expertise.expertise_id });
    setFormData({
      user_id: "",
      sme_type: expertise.sme_type,
      material_group: expertise.material_group || "",
      plant: expertise.plant || "",
      max_concurrent_reviews: expertise.max_concurrent_reviews,
      is_available: expertise.is_available,
      unavailable_until: expertise.unavailable_until || "",
      unavailable_reason: expertise.unavailable_reason || "",
      backup_user_id: expertise.backup_user_id || "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SME Expertise</CardTitle>
          <CardDescription>
            Manage subject matter expert assignments
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
              <CardTitle>SME Expertise</CardTitle>
              <CardDescription>
                Manage subject matter expert assignments and availability
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Add SME
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>SME Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Backup</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {smeExpertise && smeExpertise.length > 0 ? (
                  smeExpertise.map((expertise) => (
                    <TableRow key={expertise.expertise_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {expertise.user_name || "Unknown"}
                          </span>
                          {expertise.user_email && (
                            <span className="text-xs text-muted-foreground">
                              {expertise.user_email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expertise.sme_type_label || expertise.sme_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {expertise.material_group && (
                            <span>Group: {expertise.material_group}</span>
                          )}
                          {expertise.plant && (
                            <span>Plant: {expertise.plant}</span>
                          )}
                          {!expertise.material_group && !expertise.plant && (
                            <span className="text-muted-foreground">All</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>
                            {expertise.current_review_count} /{" "}
                            {expertise.max_concurrent_reviews}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            active reviews
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {expertise.is_available ? (
                          <Badge variant="outline" className="bg-green-50">
                            Available
                          </Badge>
                        ) : (
                          <div className="flex flex-col">
                            <Badge variant="secondary">Unavailable</Badge>
                            {expertise.unavailable_until && (
                              <span className="text-xs text-muted-foreground mt-1">
                                Until{" "}
                                {format(
                                  new Date(expertise.unavailable_until),
                                  "PP"
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {expertise.backup_user_name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(expertise)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                handleDelete(expertise.expertise_id)
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No SME expertise records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add SME Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add SME Expertise</DialogTitle>
            <DialogDescription>
              Add a subject matter expert assignment for a user.
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
              <Label>SME Type *</Label>
              <Select
                value={formData.sme_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, sme_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SME type..." />
                </SelectTrigger>
                <SelectContent>
                  {smeTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Group</Label>
                <Input
                  value={formData.material_group}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      material_group: e.target.value,
                    }))
                  }
                  placeholder="Leave empty for all"
                />
              </div>
              <div className="space-y-2">
                <Label>Plant</Label>
                <Input
                  value={formData.plant}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, plant: e.target.value }))
                  }
                  placeholder="Leave empty for all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Concurrent Reviews</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.max_concurrent_reviews}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_concurrent_reviews: parseInt(e.target.value) || 10,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Backup SME</Label>
              <UserPicker
                value={formData.backup_user_id}
                onValueChange={(userId) =>
                  setFormData((prev) => ({
                    ...prev,
                    backup_user_id: userId || "",
                  }))
                }
                placeholder="Select backup user..."
              />
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
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add SME"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit SME Dialog */}
      <Dialog
        open={editingExpertise !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExpertise(null);
            setFormData(DEFAULT_FORM_DATA);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit SME Expertise</DialogTitle>
            <DialogDescription>
              Update SME expertise details and availability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SME Type</Label>
              <Select
                value={formData.sme_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, sme_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SME type..." />
                </SelectTrigger>
                <SelectContent>
                  {smeTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Group</Label>
                <Input
                  value={formData.material_group}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      material_group: e.target.value,
                    }))
                  }
                  placeholder="Leave empty for all"
                />
              </div>
              <div className="space-y-2">
                <Label>Plant</Label>
                <Input
                  value={formData.plant}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, plant: e.target.value }))
                  }
                  placeholder="Leave empty for all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Concurrent Reviews</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.max_concurrent_reviews}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_concurrent_reviews: parseInt(e.target.value) || 10,
                  }))
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-available"
                checked={formData.is_available}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_available: checked }))
                }
              />
              <Label htmlFor="is-available">Available</Label>
            </div>

            {!formData.is_available && (
              <>
                <div className="space-y-2">
                  <Label>Unavailable Until</Label>
                  <Input
                    type="date"
                    value={formData.unavailable_until}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        unavailable_until: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={formData.unavailable_reason}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        unavailable_reason: e.target.value,
                      }))
                    }
                    placeholder="Reason for unavailability..."
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Backup SME</Label>
              <UserPicker
                value={formData.backup_user_id}
                onValueChange={(userId) =>
                  setFormData((prev) => ({
                    ...prev,
                    backup_user_id: userId || "",
                  }))
                }
                placeholder="Select backup user..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingExpertise(null);
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
