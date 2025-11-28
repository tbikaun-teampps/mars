import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "./ui/badge";
import type { SortingState } from "@tanstack/react-table";
import type { MaterialFilters } from "@/hooks/useTableUrlState";
import type { AuditLogFilters } from "@/hooks/useAuditLogUrlState";

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

interface SortableColumn {
  value: string;
  label: string;
}

// Type guard to check if filters is MaterialFilters
function isMaterialFilters(
  filters: MaterialFilters | AuditLogFilters
): filters is MaterialFilters {
  return "materialType" in filters;
}

// Type guard to check if filters is AuditLogFilters
function isAuditLogFilters(
  filters: MaterialFilters | AuditLogFilters
): filters is AuditLogFilters {
  return "materialNumber" in filters || "dateFrom" in filters;
}

interface ActiveBadgesProps {
  // Search
  search: string;
  onClearSearch: () => void;

  // Sorting
  sorting: SortingState;
  sortableColumns: SortableColumn[];
  onClearSorting: () => void;

  // Filters - can be either MaterialFilters or AuditLogFilters
  filters: MaterialFilters | AuditLogFilters;
  onRemoveFilter: (key: string, value?: string) => void;

  // Unified clear
  onClearAll: () => void;
}

export function ActiveBadges({
  search,
  onClearSearch,
  sorting,
  sortableColumns,
  onClearSorting,
  filters,
  onRemoveFilter,
  onClearAll,
}: ActiveBadgesProps) {
  const badges: React.ReactNode[] = [];

  // Search badge
  if (search) {
    const displayValue =
      search.length > 20 ? search.slice(0, 20) + "..." : search;
    badges.push(
      <Badge
        key="search"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        Search: "{displayValue}"
        <button
          onClick={onClearSearch}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // Sort badge
  if (sorting.length > 0) {
    const currentSort = sorting[0];
    const columnLabel =
      sortableColumns.find((c) => c.value === currentSort.id)?.label ||
      currentSort.id;

    badges.push(
      <Badge
        key="sort"
        variant="secondary"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
      >
        {columnLabel} {currentSort.desc ? "↓" : "↑"}
        <button
          onClick={onClearSorting}
          className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  // MaterialFilters-specific badges
  if (isMaterialFilters(filters)) {
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
        filters.minTotalValue !== undefined &&
        filters.maxTotalValue !== undefined
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
  }

  // AuditLogFilters-specific badges
  if (isAuditLogFilters(filters)) {
    // Material number badge
    if (filters.materialNumber !== undefined) {
      badges.push(
        <Badge
          key="material-number"
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
        >
          Material: {filters.materialNumber}
          <button
            onClick={() => onRemoveFilter("materialNumber")}
            className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

    // Date range badges
    if (filters.dateFrom || filters.dateTo) {
      const label =
        filters.dateFrom && filters.dateTo
          ? `Date: ${filters.dateFrom} to ${filters.dateTo}`
          : filters.dateFrom
          ? `Date: from ${filters.dateFrom}`
          : `Date: to ${filters.dateTo}`;
      badges.push(
        <Badge
          key="date-range"
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
        >
          {label}
          <button
            onClick={() => {
              onRemoveFilter("dateFrom");
              onRemoveFilter("dateTo");
            }}
            className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }

    // Changed by user badge
    if (filters.changedByUserId) {
      badges.push(
        <Badge
          key="changed-by"
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm bg-blue-100 text-blue-500"
        >
          User filter active
          <button
            onClick={() => onRemoveFilter("changedByUserId")}
            className="ml-1 hover:bg-muted rounded-full p-0.5 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      );
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges}
      <Badge
        variant="outline"
        className="gap-1 pl-2 pr-1 py-1 text-xs rounded-sm border-dashed cursor-pointer hover:bg-muted"
        onClick={onClearAll}
      >
        Clear all
        <X className="h-3 w-3" />
      </Badge>
    </div>
  );
}
