import * as React from "react";
import {
  useAllLookupOptions,
  useCreateLookupOption,
  useUpdateLookupOption,
  useDeleteLookupOption,
  useLookupOptionHistory,
} from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, History } from "lucide-react";
import { format } from "date-fns";

interface LookupOptionFormData {
  category: string;
  value: string;
  label: string;
  description: string;
  color: string;
  group_name: string;
  group_order: number;
  sort_order: number;
}

const DEFAULT_FORM_DATA: LookupOptionFormData = {
  category: "review_reason",
  value: "",
  label: "",
  description: "",
  color: "#3b82f6",
  group_name: "",
  group_order: 0,
  sort_order: 0,
};

const DEFAULT_VISIBLE_ROWS = 3;

const formatCategoryLabel = (category: string): string => {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export function LookupOptionsManager() {
  const [showInactive, setShowInactive] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingOption, setEditingOption] = React.useState<{
    option_id: number;
    category: string;
  } | null>(null);
  const [historyOptionId, setHistoryOptionId] = React.useState<number | null>(
    null
  );
  const [formData, setFormData] =
    React.useState<LookupOptionFormData>(DEFAULT_FORM_DATA);
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const { data: lookupOptions, isLoading } = useAllLookupOptions(showInactive);
  const createMutation = useCreateLookupOption();
  const updateMutation = useUpdateLookupOption();
  const deleteMutation = useDeleteLookupOption();
  const { data: historyData, isLoading: historyLoading } =
    useLookupOptionHistory(historyOptionId);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "group_order" || name === "sort_order"
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleCreate = async () => {
    if (!formData.value || !formData.label) {
      toast.error("Value and Label are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        category: formData.category,
        value: formData.value,
        label: formData.label,
        description: formData.description || undefined,
        color: formData.color || undefined,
        group_name: formData.group_name || undefined,
        group_order: formData.group_order,
        sort_order: formData.sort_order,
      });
      toast.success("Option created successfully");
      setIsAddDialogOpen(false);
      setFormData(DEFAULT_FORM_DATA);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create option"
      );
    }
  };

  const handleUpdate = async () => {
    if (!editingOption) return;

    try {
      await updateMutation.mutateAsync({
        optionId: editingOption.option_id,
        category: editingOption.category,
        data: {
          label: formData.label,
          description: formData.description || undefined,
          color: formData.color || undefined,
          group_name: formData.group_name || undefined,
          group_order: formData.group_order,
          sort_order: formData.sort_order,
        },
      });
      toast.success("Option updated successfully");
      setEditingOption(null);
      setFormData(DEFAULT_FORM_DATA);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update option"
      );
    }
  };

  // Note: Edit/Delete/Reactivate functionality requires option_id from the API
  // which is currently not included in the grouped response. These handlers
  // are prepared for when the API is updated to include option_id.
  const handleDelete = async (optionId: number, category: string) => {
    try {
      await deleteMutation.mutateAsync({ optionId, category });
      toast.success("Option deactivated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete option"
      );
    }
  };

  const handleReactivate = async (optionId: number, category: string) => {
    try {
      await updateMutation.mutateAsync({
        optionId,
        category,
        data: {
          is_active: true,
        },
      });
      toast.success("Option reactivated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reactivate option"
      );
    }
  };

  const openEditDialog = (option: {
    option_id: number;
    category: string;
    value: string;
    label: string;
    description?: string | null;
    color?: string | null;
    group_name?: string | null;
    group_order: number;
    sort_order: number;
  }) => {
    setEditingOption({
      option_id: option.option_id,
      category: option.category,
    });
    setFormData({
      category: option.category,
      value: option.value,
      label: option.label,
      description: option.description || "",
      color: option.color || "#3b82f6",
      group_name: option.group_name || "",
      group_order: option.group_order,
      sort_order: option.sort_order,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lookup Options</CardTitle>
              <CardDescription>
                Manage configurable dropdown options for the application.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive" className="text-sm">
                  Show inactive
                </Label>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Lookup Option</DialogTitle>
                    <DialogDescription>
                      Create a new configurable option for dropdowns.
                    </DialogDescription>
                  </DialogHeader>
                  <LookupOptionForm
                    formData={formData}
                    onChange={handleInputChange}
                    onColorChange={(color) =>
                      setFormData((prev) => ({ ...prev, color }))
                    }
                    isNew={true}
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.entries(lookupOptions || {}).map(([category, grouped]) => {
            const totalOptions = grouped.groups.reduce(
              (sum, g) => sum + g.options.length,
              0
            );
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium">
                    {formatCategoryLabel(category)}
                  </h3>
                  <Badge variant="secondary">{totalOptions}</Badge>
                </div>

                {grouped.groups.map((group) => {
                  const visibleOptions = isExpanded
                    ? group.options
                    : group.options.slice(0, DEFAULT_VISIBLE_ROWS);
                  const hiddenCount = group.options.length - visibleOptions.length;

                  return (
                    <div key={group.group_name || "ungrouped"} className="mb-4">
                      {group.group_name && (
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          {group.group_name}
                        </h4>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Color</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Label</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[80px]">Order</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleOptions.map((option) => (
                        <TableRow key={option.value}>
                          <TableCell>
                            <div
                              className="w-6 h-6 rounded border"
                              style={{
                                backgroundColor: option.color || "#gray",
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {option.value}
                          </TableCell>
                          <TableCell>{option.label}</TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {option.description || "-"}
                          </TableCell>
                          <TableCell>{option.sort_order}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                option.is_active ? "outline" : "secondary"
                              }
                            >
                              {option.is_active ? "Active" : "Inactive"}
                            </Badge>
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
                                  onClick={() =>
                                    openEditDialog({
                                      option_id: option.option_id,
                                      category,
                                      value: option.value,
                                      label: option.label,
                                      description: option.description,
                                      color: option.color,
                                      group_name: group.group_name,
                                      group_order: group.group_order,
                                      sort_order: option.sort_order,
                                    })
                                  }
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setHistoryOptionId(option.option_id)
                                  }
                                >
                                  <History className="h-4 w-4 mr-2" />
                                  View History
                                </DropdownMenuItem>
                                {option.is_active ? (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      handleDelete(option.option_id, category)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleReactivate(
                                        option.option_id,
                                        category
                                      )
                                    }
                                  >
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                        </TableBody>
                      </Table>
                      {hiddenCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => toggleCategory(category)}
                        >
                          Show all ({hiddenCount} more)
                        </Button>
                      )}
                      {isExpanded && group.options.length > DEFAULT_VISIBLE_ROWS && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => toggleCategory(category)}
                        >
                          Show less
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {(!lookupOptions || Object.keys(lookupOptions).length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No lookup options configured yet. Click "Add Option" to create
              one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={editingOption !== null}
        onOpenChange={(open) => !open && setEditingOption(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lookup Option</DialogTitle>
            <DialogDescription>
              Update the option details. Value cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <LookupOptionForm
            formData={formData}
            onChange={handleInputChange}
            onColorChange={(color) =>
              setFormData((prev) => ({ ...prev, color }))
            }
            isNew={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOption(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyOptionId !== null}
        onOpenChange={(open) => !open && setHistoryOptionId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
            <DialogDescription>
              View the history of changes to this option.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {historyLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : historyData && historyData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Change Type</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((record) => {
                    // Compute changed fields by comparing old and new values
                    const changedFields: {
                      field: string;
                      from: unknown;
                      to: unknown;
                    }[] = [];

                    if (record.change_type === "created") {
                      // For created, show all new values
                      if (record.new_values) {
                        Object.entries(record.new_values).forEach(
                          ([key, value]) => {
                            changedFields.push({
                              field: key,
                              from: null,
                              to: value,
                            });
                          }
                        );
                      }
                    } else if (record.old_values && record.new_values) {
                      // For updates, show only changed fields
                      Object.keys(record.new_values).forEach((key) => {
                        const oldVal = record.old_values?.[key];
                        const newVal = record.new_values?.[key];
                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                          changedFields.push({
                            field: key,
                            from: oldVal,
                            to: newVal,
                          });
                        }
                      });
                    }

                    return (
                      <TableRow key={record.history_id}>
                        <TableCell className="text-sm">
                          {format(new Date(record.changed_at), "PPp")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.change_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            {changedFields.map(({ field, from, to }) => (
                              <div key={field} className="text-xs">
                                <span className="font-medium">{field}:</span>{" "}
                                {from !== null && (
                                  <>
                                    <span className="text-muted-foreground line-through">
                                      {String(from)}
                                    </span>
                                    {" → "}
                                  </>
                                )}
                                <span className="text-foreground">
                                  {String(to)}
                                </span>
                              </div>
                            ))}
                            {changedFields.length === 0 && (
                              <span className="text-muted-foreground">
                                No changes
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No history records found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface LookupOptionFormProps {
  formData: LookupOptionFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onColorChange: (color: string) => void;
  isNew: boolean;
}

function LookupOptionForm({
  formData,
  onChange,
  onColorChange,
  isNew,
}: LookupOptionFormProps) {
  // Local state for color to avoid lag when dragging color picker
  const [localColor, setLocalColor] = React.useState(formData.color);

  // Sync when formData changes from outside (e.g., opening different option)
  React.useEffect(() => {
    setLocalColor(formData.color);
  }, [formData.color]);

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="category" className="text-right">
          Category
        </Label>
        <Input
          id="category"
          name="category"
          value={formData.category}
          onChange={onChange}
          className="col-span-3"
          disabled={!isNew}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="value" className="text-right">
          Value *
        </Label>
        <Input
          id="value"
          name="value"
          value={formData.value}
          onChange={onChange}
          className="col-span-3"
          placeholder="e.g., annual_review"
          disabled={!isNew}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="label" className="text-right">
          Label *
        </Label>
        <Input
          id="label"
          name="label"
          value={formData.label}
          onChange={onChange}
          className="col-span-3"
          placeholder="e.g., Annual Review"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onChange}
          className="col-span-3"
          placeholder="Help text for users"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="color" className="text-right">
          Color
        </Label>
        <div className="col-span-3 flex items-center gap-2">
          <Input
            id="color"
            name="color"
            type="color"
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
            onBlur={() => onColorChange(localColor)}
            className="w-16 h-10 p-1"
          />
          <Input
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
            onBlur={() => onColorChange(localColor)}
            className="flex-1"
            placeholder="#3b82f6"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="group_name" className="text-right">
          Group
        </Label>
        <Input
          id="group_name"
          name="group_name"
          value={formData.group_name}
          onChange={onChange}
          className="col-span-3"
          placeholder="e.g., Scheduled"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="group_order" className="text-right">
          Group Order
        </Label>
        <Input
          id="group_order"
          name="group_order"
          type="number"
          value={formData.group_order}
          onChange={onChange}
          className="col-span-3"
          min={0}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="sort_order" className="text-right">
          Sort Order
        </Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={onChange}
          className="col-span-3"
          min={0}
        />
      </div>
    </div>
  );
}
