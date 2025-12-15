import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { UploadHistoryFilters } from "@/hooks/useUploadHistoryUrlState";

interface UploadHistoryFilterPanelProps {
  filters: UploadHistoryFilters;
  onFiltersChange: (filters: UploadHistoryFilters) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export function UploadHistoryFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: UploadHistoryFilterPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Local state for form inputs (allows typing without immediate URL updates)
  const [localFilters, setLocalFilters] =
    React.useState<UploadHistoryFilters>(filters);

  // Sync local state when filters prop changes (e.g., from URL)
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: UploadHistoryFilters = {
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setLocalFilters(emptyFilters);
    onClearFilters();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="outline"
              className="ml-1 h-5 w-5 rounded-sm p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter Upload History</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto py-1 px-2 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Status</Label>
            <Select
              value={localFilters.status || ""}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  status: value || undefined,
                })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Date Range</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={localFilters.dateFrom ?? ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateFrom: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={localFilters.dateTo ?? ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      dateTo: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Apply Button */}
          <Button onClick={handleApplyFilters} className="w-full" size="sm">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
