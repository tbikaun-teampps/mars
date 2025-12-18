/**
 * MaterialDetailsPanel - A read-only reference panel for viewing material details.
 * Used on the MaterialReviewPage to show material context while filling out a review.
 */
import * as React from "react";
import {
  Info,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatDate } from "date-fns";
import { components } from "@/types/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RequirePermission } from "@/components/ui/require-permission";
import { useAcknowledgeInsight, useUnacknowledgeInsight } from "@/api/queries";
import { cn } from "@/lib/utils";

type MaterialWithReviews = components["schemas"]["MaterialWithReviews"];
type Insight = components["schemas"]["Insight"];

interface MaterialDetailsPanelProps {
  materialDetails: MaterialWithReviews | null | undefined;
  loading: boolean;
  isError: boolean;
  error: Error | null;
  /** Compact mode: hides insights, charts, and uses single-column layout */
  compact?: boolean;
}

// Insights Panel Component (extracted from material-detail-sheet.tsx)
function InsightsPanel({
  insights,
  materialNumber,
}: {
  insights: Insight[] | undefined;
  materialNumber: number;
}) {
  const [showAcknowledged, setShowAcknowledged] = React.useState(false);
  const acknowledgeInsight = useAcknowledgeInsight();
  const unacknowledgeInsight = useUnacknowledgeInsight();

  if (!insights || insights.length === 0) {
    return null;
  }

  // Separate acknowledged and unacknowledged insights
  const unacknowledgedInsights = insights.filter((i) => !i.acknowledged_at);
  const acknowledgedInsights = insights.filter((i) => i.acknowledged_at);

  // Show either all insights or only unacknowledged based on toggle
  const visibleInsights = showAcknowledged ? insights : unacknowledgedInsights;

  // Group insights by type
  const groupedInsights = visibleInsights.reduce(
    (acc, insight) => {
      const type = insight.insight_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(insight);
      return acc;
    },
    {} as Record<string, Insight[]>
  );

  const handleAcknowledge = (insightId: number) => {
    acknowledgeInsight.mutate({ materialNumber, insightId });
  };

  const handleUnacknowledge = (insightId: number) => {
    unacknowledgeInsight.mutate({ materialNumber, insightId });
  };

  const insightConfig: Record<
    string,
    {
      icon: React.ReactNode;
      bgColor: string;
      borderColor: string;
      textColor: string;
      label: string;
    }
  > = {
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-700 dark:text-red-400",
      label: "Error",
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      textColor: "text-yellow-700 dark:text-yellow-400",
      label: "Warning",
    },
    info: {
      icon: <Info className="h-4 w-4" />,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-700 dark:text-blue-400",
      label: "Info",
    },
    success: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-700 dark:text-green-400",
      label: "Success",
    },
  };

  const typePriority = ["error", "warning", "info", "success"];

  return (
    <div className="space-y-2 mb-4">
      {/* Toggle for showing acknowledged insights */}
      {acknowledgedInsights.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {acknowledgedInsights.length} acknowledged insight
            {acknowledgedInsights.length !== 1 ? "s" : ""} hidden
          </span>
          <button
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showAcknowledged ? (
              <>
                <EyeOff className="h-3 w-3" />
                Hide acknowledged
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Show acknowledged
              </>
            )}
          </button>
        </div>
      )}

      {unacknowledgedInsights.length === 0 && !showAcknowledged && (
        <div className="text-sm text-muted-foreground text-center py-2">
          All insights have been acknowledged
        </div>
      )}

      {typePriority.map((type) => {
        const typeInsights = groupedInsights[type] || [];
        if (typeInsights.length === 0) return null;

        const config = insightConfig[type] || insightConfig.info;

        return (
          <div
            key={type}
            className={cn(
              "rounded-md border p-3",
              config.bgColor,
              config.borderColor
            )}
          >
            <div className={cn("flex items-start gap-2", config.textColor)}>
              <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
              <div className="flex-1 space-y-1">
                <div className="font-medium text-sm">
                  {typeInsights.length} {config.label}
                  {typeInsights.length > 1 ? "s" : ""}
                </div>
                <ul className="text-xs space-y-2">
                  {typeInsights.map((insight) => (
                    <li
                      key={insight.insight_id}
                      className={cn(
                        "flex items-start justify-between gap-2",
                        insight.acknowledged_at && "opacity-60"
                      )}
                    >
                      <span
                        className={
                          insight.acknowledged_at ? "line-through" : ""
                        }
                      >
                        {insight.message}
                      </span>
                      {insight.insight_id && (
                        <RequirePermission
                          permission="can_manage_acknowledgements"
                          fallback="hide"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() =>
                                  insight.acknowledged_at
                                    ? handleUnacknowledge(insight.insight_id!)
                                    : handleAcknowledge(insight.insight_id!)
                                }
                                className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                disabled={
                                  acknowledgeInsight.isPending ||
                                  unacknowledgeInsight.isPending
                                }
                              >
                                {insight.acknowledged_at ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {insight.acknowledged_at ? (
                                <p className="text-xs">
                                  Acknowledged by{" "}
                                  {insight.acknowledged_by_user?.full_name ||
                                    "Unknown"}
                                  <br />
                                  Click to restore
                                </p>
                              ) : (
                                <p className="text-xs">
                                  Acknowledge this insight
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </RequirePermission>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper function for currency formatting
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

// Section header component
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex-1 border-t border-gray-300" />
      <h3 className="text-md font-semibold whitespace-nowrap">{title}</h3>
      <div className="flex-1 border-t border-gray-300" />
    </div>
  );
}

// Metric item with tooltip
function MetricItem({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-[200px] whitespace-pre-line">
              {description}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function MaterialDetailsPanel({
  materialDetails,
  loading,
  isError,
  error,
  compact = false,
}: MaterialDetailsPanelProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error loading details:{" "}
          {error?.message ?? "Failed to fetch material details"}
        </p>
      </div>
    );
  }

  if (!materialDetails) {
    return null;
  }

  const basicInformation = [
    {
      label: "Material Number",
      description: "Unique ID/part number for each material.",
      value: materialDetails.material_number || "N/A",
    },
    {
      label: "Description",
      description: "Name/description of the material.",
      value: materialDetails.material_desc || "N/A",
    },
    {
      label: "Type",
      description:
        "Category or classification of the material.\n- ANAM: Ancillary Materials\n- CHEM: Chemicals\n- CORE: Core/Critical Components\n- FING: Finished Goods\n- INSRV: In-Service Items\n- OPER: Operating Supplies\n- RAWM: Raw Materials\n- ROTG: Rotables\n- RSTK: Repairable Stock\n- SPRS: Spares",
      value: materialDetails.material_type || "N/A",
    },
    {
      label: "Created On",
      description: "Date when the material was created in the system.",
      value: materialDetails
        ? formatDate(materialDetails.created_on, "PPpp")
        : "N/A",
    },
  ];

  const inventoryMetrics = [
    {
      label: "Total Quantity",
      description: "The total quantity of the material in stock.",
      value:
        materialDetails.total_quantity?.toLocaleString() ?? "Not Available",
    },
    {
      label: "Total Value",
      description: "Monetary value of total inventory (Qty x Unit Price).",
      value: formatCurrency(materialDetails.total_value || 0),
    },
    {
      label: "Unit Value",
      description:
        "The value per unit of the material, calculated as Total Value divided by Total Quantity.",
      value: formatCurrency(materialDetails.unit_value || 0),
    },
    {
      label: "Unrestricted Quantity",
      description:
        "Available quantity for use without restrictions (not reserved, not allocated, etc.).",
      value:
        materialDetails.unrestricted_quantity?.toLocaleString() ??
        "Not Available",
    },
    {
      label: "Safety Stock",
      description: "Minimum inventory level to prevent stockouts.",
      value: materialDetails.safety_stock?.toLocaleString() ?? "Not Available",
    },
  ];

  const consumptionMetrics = [
    {
      label: "Coverage Ratio",
      description:
        "Current stock divided by average 3-year consumption (shows months/years of supply).",
      value:
        materialDetails.coverage_ratio?.toLocaleString() ?? "Not Available",
    },
    {
      label: "Max Consumption Demand",
      description:
        "Highest value between consumption average and 12-month demand.",
      value:
        materialDetails.max_cons_demand?.toLocaleString() ?? "Not Available",
    },
    {
      label: "Purchase Quantity (Last 2 Years)",
      description:
        "Total quantity of the material purchased in the last 2 years.",
      value:
        materialDetails.purchased_qty_2y?.toLocaleString() ?? "Not Available",
    },
  ];

  // Grid class based on compact mode
  const gridClass = compact ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-4";

  return (
    <div className="space-y-6">
      {/* Insights Panel - hidden in compact mode */}
      {!compact && materialDetails.insights && materialDetails.insights.length > 0 && (
        <InsightsPanel
          insights={materialDetails.insights}
          materialNumber={materialDetails.material_number}
        />
      )}

      {/* Basic Information */}
      <div>
        <SectionHeader title="Basic Information" />
        <div className={gridClass}>
          {basicInformation.map((info, index) => (
            <MetricItem
              key={index}
              label={info.label}
              description={info.description}
              value={info.value}
            />
          ))}
        </div>
      </div>

      {/* Inventory Metrics */}
      <div>
        <SectionHeader title="Inventory" />
        <div className={gridClass}>
          {inventoryMetrics.map((metric, index) => (
            <MetricItem
              key={index}
              label={metric.label}
              description={metric.description}
              value={metric.value}
            />
          ))}
        </div>
      </div>

      {/* Consumption Metrics */}
      <div>
        <SectionHeader title="Consumption" />
        <div className={gridClass}>
          {consumptionMetrics.map((metric, index) => (
            <MetricItem
              key={index}
              label={metric.label}
              description={metric.description}
              value={metric.value}
            />
          ))}
        </div>
      </div>

      {/* 5-Year Consumption Chart - hidden in compact mode */}
      {!compact && (
        <div>
          <SectionHeader title="5-Year Consumption History" />
          <div className="mx-auto">
            {materialDetails.consumption_history_5yr &&
            materialDetails.consumption_history_5yr.length > 0 ? (
              <ChartContainer
                config={{
                  quantity: {
                    label: "Quantity",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                style={{ height: "150px", width: "100%" }}
              >
                <AreaChart
                  data={[...materialDetails.consumption_history_5yr]
                    .sort((a, b) => b.years_ago - a.years_ago)
                    .map((item) => ({
                      year: `${item.years_ago}Y ago`,
                      quantity: item.quantity,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="linear"
                    dataKey="quantity"
                    stroke="var(--color-quantity)"
                    fill="var(--color-quantity)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                No consumption history available
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
