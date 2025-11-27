import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { components } from "@/types/api";
import { DataTable } from "@/components/data-table";
import { MaterialDetailSheet } from "@/components/material-detail-sheet";
import {
  MaterialsFilterPanel,
  ActiveFilterBadges,
} from "@/components/materials-filter-panel";
import { SortingPanel, ActiveSortBadge } from "@/components/sorting-panel";
import { SearchInput, ActiveSearchBadge } from "@/components/search-input";
import { format, formatDistanceToNow } from "date-fns";
import { Lightbulb } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useMaterials } from "@/api/queries";
import { useTableUrlState } from "@/hooks/useTableUrlState";
import { cn } from "@/lib/utils";

type Material = components["schemas"]["Material"];

// Simple Sparkline component for consumption history
function Sparkline({
  data,
}: {
  data: Array<{ years_ago: number; quantity: number }> | null | undefined;
}) {
  if (!data || data.length === 0) {
    return <div className="text-xs text-muted-foreground">No data</div>;
  }

  // Sort by years_ago (descending) to show oldest to newest
  const sortedData = [...data].sort((a, b) => b.years_ago - a.years_ago);

  // Transform data for Recharts
  const chartData = sortedData.map((d, index) => ({
    index,
    value: d.quantity,
    isZero: d.quantity === 0,
  }));

  return (
    <div style={{ width: 60, height: 20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <Area
            dataKey="value"
            stroke="#777777ff"
            strokeWidth={1}
            fill="#cccccc"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MaterialsTable() {
  const [selectedMaterialNumber, setSelectedMaterialNumber] = React.useState<
    number | null
  >(null);
  const [selectedMaterialDescription, setSelectedMaterialDescription] =
    React.useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  // Use URL-based state for pagination, sorting, and filters
  const {
    pageIndex,
    pageSize,
    sorting,
    filters,
    activeFilterCount,
    setPagination,
    setSorting,
    setFilters,
    clearFilters,
    removeFilter,
    setSearch,
  } = useTableUrlState();

  // Build query params from UI state
  const skip = pageIndex * pageSize;
  const sortBy = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  // Fetch materials using React Query with filters
  const { data, isLoading, isError, error } = useMaterials({
    skip,
    limit: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
    // Filter params
    material_type:
      filters.materialType.length > 0 ? filters.materialType : undefined,
    min_total_value: filters.minTotalValue,
    max_total_value: filters.maxTotalValue,
    min_total_quantity: filters.minTotalQuantity,
    max_total_quantity: filters.maxTotalQuantity,
    last_reviewed_filter: filters.lastReviewedFilter,
    next_review_filter: filters.nextReviewFilter,
    has_reviews: filters.hasReviews,
    has_errors: filters.hasErrors,
    has_warnings: filters.hasWarnings,
    search: filters.search,
  });

  const materials = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleRowClick = (material: Material) => {
    setSelectedMaterialNumber(material.material_number);
    setSelectedMaterialDescription(material.material_desc);
    setIsSheetOpen(true);
  };

  const pageCount = Math.ceil(total / pageSize);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  };

  const getMaterialTypeBadgeColor = (type: string) => {
    switch (type) {
      case "CHEM":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "CORE":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "FING":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "OPER":
        return "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "RAWM":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "ROTG":
        return "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
      case "SPRS":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  /**
   *
   * @param dateStr
   * @returns
   */
  const getLastReviewedBadgeColor = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

    if (diffInDays <= 30) {
      return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    } else if (diffInDays <= 90) {
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    } else {
      return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  const columns: ColumnDef<Material>[] = [
    {
      id: "insights",
      accessorKey: "insights",
      header: "",
      cell: ({ row }) => {
        const insights = row.original.insights;
        if (!insights || insights.length === 0) {
          return null;
        }

        // Count insights by type
        const counts = insights.reduce((acc, insight) => {
          const type = insight.insight_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Build tooltip text
        const typePriority = ["error", "warning", "info", "success"];
        const typeLabels: Record<string, string> = {
          error: "Error",
          warning: "Warning",
          info: "Info",
          success: "Success",
        };
        const tooltipParts = typePriority
          .filter((type) => counts[type])
          .map(
            (type) =>
              `${counts[type]} ${typeLabels[type]}${
                counts[type] > 1 ? "s" : ""
              }`
          );
        const tooltipText = tooltipParts.join(", ");

        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge
                className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 cursor-pointer hover:opacity-80 flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMaterialNumber(row.original.material_number);
                  setSelectedMaterialDescription(row.original.material_desc);
                  setIsSheetOpen(true);
                }}
              >
                <Lightbulb className="h-3 w-3" />
                {insights.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: "material_number",
      header: "Number",
      cell: ({ row }) => (
        <div className="font-medium text-xs">
          {row.getValue("material_number")}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: "material_desc",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("material_desc")}</div>
      ),
      size: 300,
    },
    {
      accessorKey: "material_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("material_type") as string;
        return (
          <div>
            <Badge className={getMaterialTypeBadgeColor(type)}>{type}</Badge>
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: "total_quantity",
      header: "Total Qty",
      cell: ({ row }) => {
        const qty = row.getValue("total_quantity") as number;
        return (
          <div className="font-medium text-xs">{qty.toLocaleString()}</div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "total_value",
      header: "Total Value",
      cell: ({ row }) => {
        const value = row.getValue("total_value") as number;
        return (
          <div className="font-medium text-xs">{formatCurrency(value)}</div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "unit_value",
      header: "Unit Value",
      cell: ({ row }) => {
        const value = row.getValue("unit_value") as number;
        return (
          <div className="font-medium text-xs">{formatCurrency(value)}</div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "safety_stock",
      header: "Safety Stock Qty",
      cell: ({ row }) => {
        return (
          <div className="font-medium text-xs">
            {(row.getValue("safety_stock") as number).toLocaleString()}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: "coverage_ratio",
      header: "Coverage Ratio",
      cell: ({ row }) => {
        return (
          <div className="font-medium text-xs">
            {(row.getValue("coverage_ratio") as number).toLocaleString()}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: "consumption_history_5yr",
      header: "Consumption Trend",
      cell: ({ row }) => {
        const history = row.getValue("consumption_history_5yr") as
          | Array<{ years_ago: number; quantity: number }>
          | null
          | undefined;
        return (
          <div className="flex items-center justify-start">
            <Sparkline data={history} />
          </div>
        );
      },
      size: 140,
    },
    {
      accessorKey: "created_on",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("created_on") as string;
        return (
          <div className="text-xs">
            <div>
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </div>
            <div className="text-muted-foreground text-[10px]">
              {format(new Date(date), "yyyy-MM-dd")}
            </div>
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: "reviews_count",
      header: "Reviews",
      cell: ({ row }) => {
        const count = row.getValue("reviews_count") as number;
        return (
          <Badge variant={count > 0 ? "secondary" : "destructive"}>
            {count}
          </Badge>
        );
      },
      size: 60,
    },
    {
      accessorKey: "last_reviewed",
      header: "Last Reviewed",
      cell: ({ row }) => {
        const date = row.getValue("last_reviewed") as string;
        const hasActiveReview = row.original.has_active_review;

        if (hasActiveReview) {
          return (
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              In Review
            </Badge>
          );
        }
        if (!date) {
          return <Badge variant="destructive">Not Reviewed</Badge>;
        }
        return (
          <Badge className={getLastReviewedBadgeColor(date)}>
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </Badge>
        );
      },
      size: 140,
    },
    {
      accessorKey: "next_review",
      header: "Next Review",
      cell: ({ row }) => {
        const nextReviewDate = row.original.next_review;
        const lastReviewedDate = row.original.last_reviewed;
        const hasActiveReview = row.original.has_active_review;

        if (hasActiveReview) {
          return (
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              In Review
            </Badge>
          );
        }
        if (!nextReviewDate && !lastReviewedDate) {
          return <Badge variant="destructive">Not Reviewed</Badge>;
        }
        if (!nextReviewDate) {
          return <Badge variant="outline">Not Scheduled</Badge>;
        }
        return (
          <Badge className={getLastReviewedBadgeColor(nextReviewDate)}>
            {formatDistanceToNow(new Date(nextReviewDate), {
              addSuffix: true,
            })}
          </Badge>
        );
      },
      size: 160,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading materials...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">
          Error: {error?.message ?? "Failed to fetch materials"}
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={materials}
        onRowClick={handleRowClick}
        manualPagination={true}
        pageCount={pageCount}
        pagination={{ pageIndex, pageSize }}
        totalRows={total}
        onPaginationChange={setPagination}
        manualSorting={true}
        sorting={sorting}
        onSortingChange={setSorting}
        columnPinning={{
          left: ["insights", "material_number", "material_desc"],
          right: ["reviews_count", "last_reviewed", "next_review"],
        }}
        searchPanel={
          <SearchInput
            value={filters.search || ""}
            onChange={setSearch}
            placeholder="Search materials..."
          />
        }
        sortPanel={
          <SortingPanel
            sortableColumns={[
              { value: "material_number", label: "Material Number" },
              { value: "material_desc", label: "Material Description" },
              { value: "created_on", label: "Created Date" },
              { value: "total_quantity", label: "Total Quantity" },
              { value: "total_value", label: "Total Value" },
              { value: "unit_value", label: "Unit Value" },
              { value: "safety_stock", label: "Safety Stock" },
            ]}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        }
        filterPanel={
          <MaterialsFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        }
        activeFilterBadges={
          <>
            <ActiveSearchBadge
              value={filters.search || ""}
              onClear={() => setSearch("")}
            />
            <ActiveSortBadge
              sorting={sorting}
              sortableColumns={[
                { value: "material_number", label: "Material Number" },
                { value: "material_desc", label: "Material Description" },
                { value: "created_on", label: "Created Date" },
                { value: "total_quantity", label: "Total Quantity" },
                { value: "total_value", label: "Total Value" },
                { value: "unit_value", label: "Unit Value" },
                { value: "safety_stock", label: "Safety Stock" },
              ]}
              onClear={() => setSorting([])}
            />
            <ActiveFilterBadges
              filters={filters}
              onRemoveFilter={removeFilter}
              onClearAll={clearFilters}
            />
          </>
        }
      />

      <MaterialDetailSheet
        materialNumber={selectedMaterialNumber}
        materialDescription={selectedMaterialDescription}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  );
}
