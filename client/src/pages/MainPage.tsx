import { MaterialsTable } from "@/components/materials-table";
import { MaterialsScatterChart } from "@/components/materials-scatter-chart";
import { AuditLog } from "@/components/audit-log";
import { UploadHistory } from "@/components/upload-history";
import { ChartBarLabel } from "@/components/chart-bar-label";
import { MaterialsFilterPanel } from "@/components/materials-filter-panel";
import { SearchInput } from "@/components/search-input";
import { ActiveBadges } from "@/components/active-badges";
import { useTableUrlState } from "@/hooks/useTableUrlState";
import { useChartUrlState } from "@/hooks/useChartUrlState";
import {
  TrendingUp,
  TrendingDown,
  Table2,
  ScatterChart,
  ChevronRight,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import numeral from "numeral";
import { getMaterialTypeHexColor } from "@/lib/utils";
import { AppLayout } from "@/components/app-layout";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ChartConfig } from "@/components/ui/chart";
import { useDashboardRecentActivity, useDashboardSummary } from "@/api/queries";
import { useLocation, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type View = "dashboard" | "audit-log" | "uploads";

const opportunitiesConfig = {
  value: {
    label: "Value ($)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const rejectionsConfig = {
  percentage: {
    label: "Rejection Rate",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function getTrendDirectionInfo(value?: number) {
  if (value === undefined) {
    return {
      direction: "neutral" as const,
      Icon: null,
    };
  }
  if (value > 0) {
    return {
      direction: "up" as const,
      Icon: TrendingUp,
    };
  } else if (value < 0) {
    return {
      direction: "down" as const,
      Icon: TrendingDown,
    };
  } else {
    return {
      direction: "neutral" as const,
      Icon: null,
    };
  }
}

function SectionCard({
  title,
  value,
  change,
  description,
  isLoading,
}: {
  title: string;
  value?: string | number;
  change?: number;
  description: string;
  isLoading?: boolean;
}) {
  const trendInfo = getTrendDirectionInfo(change);
  const { direction, Icon } = trendInfo;
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {isLoading ? <Skeleton className="h-8 w-24" /> : value ?? "-"}
        </CardTitle>
        <CardAction>
          {isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <Badge variant="outline">
              {Icon && <Icon />}
              {change !== undefined ? numeral(change).format("0.0%") : "-"}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-xs">
        {isLoading ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <div className="line-clamp-1 flex gap-2 font-medium text-xs items-center">
            {direction === "neutral"
              ? "No change since last upload"
              : `Trending ${direction} this since last upload`}
            {Icon && <Icon className="size-3" />}
          </div>
        )}
        <div className="text-muted-foreground">{description}</div>
      </CardFooter>
    </Card>
  );
}

interface MainPageProps {
  view: View;
}

export function MainPage({ view }: MainPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Build breadcrumbs from URL path
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => ({
    label: segment.replace("-", " "),
    href: index < pathSegments.length - 1 ? `/${pathSegments.slice(0, index + 1).join("/")}` : undefined,
  }));

  // Chart view state from URL
  const { view: materialsViewMode, setView: setMaterialsViewMode } =
    useChartUrlState();

  // Shared filters for materials table and chart
  const {
    sorting,
    filters,
    activeFilterCount,
    setSorting,
    setFilters,
    clearFilters,
    clearAll,
    removeFilter,
    setSearch,
  } = useTableUrlState();

  const activeView = view;

  const { data: dashboardSummary, isLoading: isDashboardSummaryLoading } =
    useDashboardSummary(activeView == "dashboard");

  const { data: dashboardActivity, isLoading: isDashboardActivityLoading } =
    useDashboardRecentActivity(activeView == "dashboard");

  const headerRight = (
    <Badge variant="secondary">
      Last Upload:{" "}
      {dashboardSummary?.last_upload_date
        ? `${new Date(
            dashboardSummary.last_upload_date
          ).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })} (${formatDistanceToNow(
            new Date(dashboardSummary.last_upload_date),
            { addSuffix: true }
          )})`
        : "No data uploaded"}
    </Badge>
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} headerRight={headerRight}>
      {activeView === "dashboard" ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-2">
              <SectionCard
                title="Inventory"
                value={numeral(
                  dashboardSummary?.total_inventory_value
                ).format("$0.0a")}
                change={dashboardSummary?.total_inventory_value_change}
                description="Total inventory value"
                isLoading={isDashboardSummaryLoading}
              />
              <SectionCard
                title="Opportunity"
                value={numeral(
                  dashboardSummary?.opportunity_value
                ).format("$0.0a")}
                change={dashboardSummary?.opportunity_value_change}
                description="Potential optimistic value in flagged materials"
                isLoading={isDashboardSummaryLoading}
              />
              <ChartBarLabel
                title="Outstanding Opportunities"
                data={(dashboardSummary?.outstanding_opportunities_chart_data ?? []) as Record<string, string | number>[]}
                config={opportunitiesConfig}
                xAxisKey="materialType"
                dataKey="value"
                valueFormatter={(value) => numeral(value).format("$0a")}
                colorKey="materialType"
                colorFn={getMaterialTypeHexColor}
              />
              <SectionCard
                title="Overdue Reviews"
                value={numeral(
                  dashboardSummary?.total_overdue_reviews
                ).format("0a")}
                change={dashboardSummary?.total_overdue_reviews_change}
                description="Materials that are overdue for review"
                isLoading={isDashboardSummaryLoading}
              />
              <SectionCard
                title="Acceptance Rate"
                value={numeral(
                  dashboardSummary?.acceptance_rate
                ).format("0.0%")}
                change={dashboardSummary?.acceptance_rate_change}
                description="Materials that are overdue for review"
                isLoading={isDashboardSummaryLoading}
              />

              <ChartBarLabel
                title="Rejected Changes"
                data={(dashboardSummary?.review_status_chart_data ?? []) as Record<string, string | number>[]}
                config={rejectionsConfig}
                xAxisKey="materialType"
                dataKey="percentage"
                valueFormatter={(v) => `${v}%`}
                secondaryLabelKey="count"
                secondaryFormatter={(v) => `(${v})`}
                colorKey="materialType"
                colorFn={getMaterialTypeHexColor}
              />
            </div>
            <div className="relative">
              <Card className="absolute inset-0 flex flex-col">
                <CardHeader>
                  <CardDescription>Recent Activity</CardDescription>
                  <CardAction>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs text-muted-foreground h-auto p-0"
                      onClick={() => navigate("/app/audit-logs")}
                    >
                      View All <ChevronRight className="h-3 w-3" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-hidden">
                  <ul className="h-full overflow-y-auto">
                    {isDashboardActivityLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <li
                          key={i}
                          className="border-muted border p-2 mb-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Skeleton className="size-8 rounded-lg" />
                            <div className="flex flex-1 flex-col gap-1">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </li>
                      ))
                    ) : dashboardActivity?.length == 0 ? (
                      <p className="text-center text-muted-foreground">
                        No recent activity
                      </p>
                    ) : (
                      dashboardActivity?.map((activity) => {
                        const initials =
                          activity.changed_by_user?.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?";
                        return (
                          <li
                            key={activity.audit_id}
                            className="border-muted border p-2 mb-2 rounded-md bg-muted/50 text-sm hover:bg-muted transition-color"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer">
                                    <Avatar className="size-8">
                                      <AvatarFallback className="text-xs bg-sidebar-primary/50 text-sidebar-primary-foreground">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {activity.changed_by_user
                                    ?.full_name || "Unknown user"}
                                </TooltipContent>
                              </Tooltip>
                              <div className="flex flex-1 flex-col w-0">
                                <p className="text-xs line-clamp-2">
                                  {activity.change_summary} on{" "}
                                  {activity.material_desc} (#
                                  {activity.material_number})
                                </p>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {new Date(
                                    activity.timestamp
                                  ).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}{" "}
                                  (
                                  {formatDistanceToNow(
                                    new Date(activity.timestamp),
                                    { addSuffix: true }
                                  )}
                                  )
                                </span>
                              </div>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Filter controls and view toggle */}
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Active filter badges on the left */}
            <div className="flex-1">
              <ActiveBadges
                search={filters.search || ""}
                onClearSearch={() => setSearch("")}
                sorting={sorting}
                sortableColumns={[
                  {
                    value: "material_number",
                    label: "Material Number",
                  },
                  {
                    value: "material_desc",
                    label: "Material Description",
                  },
                  { value: "created_on", label: "Created Date" },
                  { value: "total_quantity", label: "Total Quantity" },
                  { value: "total_value", label: "Total Value" },
                  { value: "unit_value", label: "Unit Value" },
                  { value: "safety_stock", label: "Safety Stock" },
                ]}
                onClearSorting={() => setSorting([])}
                filters={filters}
                onRemoveFilter={removeFilter}
                onClearAll={clearAll}
              />
            </div>

            {/* Search, filters, separator, and view toggle on the right */}
            <div className="flex items-center gap-2">
              <SearchInput
                value={filters.search || ""}
                onChange={setSearch}
                placeholder="Search materials..."
              />
              <MaterialsFilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
                activeFilterCount={activeFilterCount}
              />
              <div className="h-6 w-px bg-border mx-1" />
              <ToggleGroup
                type="single"
                value={materialsViewMode}
                onValueChange={(value) =>
                  value &&
                  setMaterialsViewMode(value as "table" | "chart")
                }
                size="sm"
              >
                <ToggleGroupItem value="table" aria-label="Table view">
                  <Table2 className="h-4 w-4 mr-1" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="chart" aria-label="Chart view">
                  <ScatterChart className="h-4 w-4 mr-1" />
                  Chart
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {materialsViewMode === "table" ? (
            <MaterialsTable />
          ) : (
            <MaterialsScatterChart />
          )}
        </div>
      ) : activeView === "uploads" ? (
        <UploadHistory />
      ) : (
        <AuditLog />
      )}
    </AppLayout>
  );
}
