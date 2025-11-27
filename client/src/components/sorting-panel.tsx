import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Separator } from "./ui/separator";
import type { SortingState } from "@tanstack/react-table";

interface SortableColumn {
  value: string;
  label: string;
}

interface SortingPanelProps {
  sortableColumns: SortableColumn[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

export function SortingPanel({
  sortableColumns,
  sorting,
  onSortingChange,
}: SortingPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Local state for the popover form
  const [localSortBy, setLocalSortBy] = React.useState<string>(
    sorting[0]?.id || ""
  );
  const [localSortDesc, setLocalSortDesc] = React.useState<boolean>(
    sorting[0]?.desc ?? false
  );

  // Sync local state when sorting prop changes
  React.useEffect(() => {
    setLocalSortBy(sorting[0]?.id || "");
    setLocalSortDesc(sorting[0]?.desc ?? false);
  }, [sorting]);

  const handleApply = () => {
    if (localSortBy) {
      onSortingChange([{ id: localSortBy, desc: localSortDesc }]);
    } else {
      onSortingChange([]);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalSortBy("");
    setLocalSortDesc(false);
    onSortingChange([]);
    setIsOpen(false);
  };

  const hasSorting = sorting.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button variant="ghost">
          <ArrowUpDown className="h-4 w-4" />
          Sort
          {hasSorting && (
            <Badge
              variant="outline"
              className="ml-1 h-5 w-5 rounded-sm p-0 flex items-center justify-center text-xs"
            >
              1
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Sort by</h4>
            {hasSorting && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-auto py-1 px-2 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Separator />

          {/* Column Selection */}
          <RadioGroup value={localSortBy} onValueChange={setLocalSortBy}>
            {sortableColumns.map((column) => (
              <div key={column.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={column.value}
                  id={`sort-${column.value}`}
                />
                <Label
                  htmlFor={`sort-${column.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {localSortBy && (
            <>
              <Separator />

              {/* Direction Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Direction</Label>
                <RadioGroup
                  value={localSortDesc ? "desc" : "asc"}
                  onValueChange={(value) => setLocalSortDesc(value === "desc")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="asc" id="sort-asc" />
                    <Label
                      htmlFor="sort-asc"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1"
                    >
                      <ArrowUp className="h-3 w-3" />
                      Ascending (Low to High)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="desc" id="sort-desc" />
                    <Label
                      htmlFor="sort-desc"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1"
                    >
                      <ArrowDown className="h-3 w-3" />
                      Descending (High to Low)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleApply} className="w-full" size="sm">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ActiveSortBadgeProps {
  sorting: SortingState;
  sortableColumns: SortableColumn[];
  onClear: () => void;
}

export function ActiveSortBadge({
  sorting,
  sortableColumns,
  onClear,
}: ActiveSortBadgeProps) {
  if (sorting.length === 0) return null;

  const currentSort = sorting[0];
  const columnLabel =
    sortableColumns.find((c) => c.value === currentSort.id)?.label ||
    currentSort.id;

  return (
    <Badge
      variant="secondary"
      className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
    >
      {columnLabel} {currentSort.desc ? "↓" : "↑"}
      <button
        onClick={onClear}
        className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
