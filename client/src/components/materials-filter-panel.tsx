import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import type { MaterialFilters } from "@/hooks/useTableUrlState";

// Helper to format currency for display
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);

// Labels for filter options
const LAST_REVIEWED_LABELS: Record<string, string> = {
  never: "Never reviewed",
  overdue_30: "Last reviewed >30d ago",
  overdue_90: "Last reviewed >90d ago",
};

const NEXT_REVIEW_LABELS: Record<string, string> = {
  overdue: "Next review overdue",
  due_soon: "Next review due soon",
  not_scheduled: "Next review not scheduled",
};

interface ActiveFilterBadgesProps {
  filters: MaterialFilters;
  onRemoveFilter: (key: keyof MaterialFilters, value?: string) => void;
  onClearAll?: () => void;
}

export function ActiveFilterBadges({
  filters,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterBadgesProps) {
  const badges: React.ReactNode[] = [];

  // Material type badges
  filters.materialType.forEach((type) => {
    badges.push(
      <Badge
        key={`type-${type}`}
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        Type: {type}
        <button
          onClick={() => onRemoveFilter("materialType", type)}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  });

  // Value range badges
  if (
    filters.minTotalValue !== undefined ||
    filters.maxTotalValue !== undefined
  ) {
    const label =
      filters.minTotalValue !== undefined && filters.maxTotalValue !== undefined
        ? `Value: ${formatCurrency(filters.minTotalValue)} - ${formatCurrency(
            filters.maxTotalValue
          )}`
        : filters.minTotalValue !== undefined
        ? `Value: ≥${formatCurrency(filters.minTotalValue)}`
        : `Value: ≤${formatCurrency(filters.maxTotalValue!)}`;
    badges.push(
      <Badge
        key="value-range"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {label}
        <button
          onClick={() => {
            onRemoveFilter("minTotalValue");
            onRemoveFilter("maxTotalValue");
          }}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Quantity range badges
  if (
    filters.minTotalQuantity !== undefined ||
    filters.maxTotalQuantity !== undefined
  ) {
    const label =
      filters.minTotalQuantity !== undefined &&
      filters.maxTotalQuantity !== undefined
        ? `Qty: ${filters.minTotalQuantity.toLocaleString()} - ${filters.maxTotalQuantity.toLocaleString()}`
        : filters.minTotalQuantity !== undefined
        ? `Qty: ≥${filters.minTotalQuantity.toLocaleString()}`
        : `Qty: ≤${filters.maxTotalQuantity!.toLocaleString()}`;
    badges.push(
      <Badge
        key="qty-range"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {label}
        <button
          onClick={() => {
            onRemoveFilter("minTotalQuantity");
            onRemoveFilter("maxTotalQuantity");
          }}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Last reviewed badge
  if (filters.lastReviewedFilter) {
    badges.push(
      <Badge
        key="last-reviewed"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {LAST_REVIEWED_LABELS[filters.lastReviewedFilter] ||
          filters.lastReviewedFilter}
        <button
          onClick={() => onRemoveFilter("lastReviewedFilter")}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Next review badge
  if (filters.nextReviewFilter) {
    badges.push(
      <Badge
        key="next-review"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {NEXT_REVIEW_LABELS[filters.nextReviewFilter] ||
          filters.nextReviewFilter}
        <button
          onClick={() => onRemoveFilter("nextReviewFilter")}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Has reviews badge
  if (filters.hasReviews !== undefined) {
    badges.push(
      <Badge
        key="has-reviews"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        Has reviews
        <button
          onClick={() => onRemoveFilter("hasReviews")}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Has errors badge
  if (filters.hasErrors !== undefined) {
    badges.push(
      <Badge
        key="has-errors"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      >
        Has errors
        <button
          onClick={() => onRemoveFilter("hasErrors")}
          className="ml-1 hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Has warnings badge
  if (filters.hasWarnings !== undefined) {
    badges.push(
      <Badge
        key="has-warnings"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      >
        Has warnings
        <button
          onClick={() => onRemoveFilter("hasWarnings")}
          className="ml-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges}
      {onClearAll && (
        <Badge
          variant="outline"
          className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-muted border-dashed cursor-pointer hover:bg-muted"
          onClick={onClearAll}
        >
          Clear all
          <X className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
}

interface MaterialsFilterPanelProps {
  filters: MaterialFilters;
  onFiltersChange: (filters: MaterialFilters) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const MATERIAL_TYPES = [
  { value: "SPRS", label: "SPRS (Spare Parts)" },
  { value: "ROTG", label: "ROTG (Rotables)" },
  { value: "FING", label: "FING (Finished)" },
];

const LAST_REVIEWED_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "never", label: "Never reviewed" },
  { value: "overdue_30", label: "Over 30 days ago" },
  { value: "overdue_90", label: "Over 90 days ago" },
];

const NEXT_REVIEW_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "overdue", label: "Overdue (past due)" },
  { value: "due_soon", label: "Due soon (within 30 days)" },
  { value: "not_scheduled", label: "Not scheduled" },
];

export function MaterialsFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: MaterialsFilterPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Local state for form inputs (allows typing without immediate URL updates)
  const [localFilters, setLocalFilters] =
    React.useState<MaterialFilters>(filters);

  // Sync local state when filters prop changes (e.g., from URL)
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleMaterialTypeToggle = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...localFilters.materialType, type]
      : localFilters.materialType.filter((t) => t !== type);
    setLocalFilters({ ...localFilters, materialType: newTypes });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: MaterialFilters = {
      materialType: [],
      minTotalValue: undefined,
      maxTotalValue: undefined,
      minTotalQuantity: undefined,
      maxTotalQuantity: undefined,
      lastReviewedFilter: undefined,
      nextReviewFilter: undefined,
      hasReviews: undefined,
      hasErrors: undefined,
      hasWarnings: undefined,
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
            <h4 className="font-medium text-sm">Filter Materials</h4>
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

          {/* Material Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Material Type</Label>
            <div className="space-y-2">
              {MATERIAL_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={localFilters.materialType.includes(type.value)}
                    onCheckedChange={(checked) =>
                      handleMaterialTypeToggle(type.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`type-${type.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total Value Range */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Total Value Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                className="h-8 text-sm"
                value={localFilters.minTotalValue ?? ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    minTotalValue: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="number"
                placeholder="Max"
                className="h-8 text-sm"
                value={localFilters.maxTotalValue ?? ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    maxTotalValue: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Total Quantity Range */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Total Quantity Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                className="h-8 text-sm"
                value={localFilters.minTotalQuantity ?? ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    minTotalQuantity: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="number"
                placeholder="Max"
                className="h-8 text-sm"
                value={localFilters.maxTotalQuantity ?? ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    maxTotalQuantity: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Last Reviewed */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Last Reviewed</Label>
            <Select
              value={localFilters.lastReviewedFilter || "any"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  lastReviewedFilter: value === "any" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {LAST_REVIEWED_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Review */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Next Review</Label>
            <Select
              value={localFilters.nextReviewFilter || "any"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  nextReviewFilter: value === "any" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {NEXT_REVIEW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Reviews & Insights */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Reviews & Insights</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-reviews"
                  checked={localFilters.hasReviews === true}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      hasReviews: checked ? true : undefined,
                    })
                  }
                />
                <Label
                  htmlFor="has-reviews"
                  className="text-sm font-normal cursor-pointer"
                >
                  Has reviews
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-errors"
                  checked={localFilters.hasErrors === true}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      hasErrors: checked ? true : undefined,
                    })
                  }
                />
                <Label
                  htmlFor="has-errors"
                  className="text-sm font-normal cursor-pointer"
                >
                  Has error insights
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-warnings"
                  checked={localFilters.hasWarnings === true}
                  onCheckedChange={(checked) =>
                    setLocalFilters({
                      ...localFilters,
                      hasWarnings: checked ? true : undefined,
                    })
                  }
                />
                <Label
                  htmlFor="has-warnings"
                  className="text-sm font-normal cursor-pointer"
                >
                  Has warning insights
                </Label>
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
