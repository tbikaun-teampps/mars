import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatDate, formatDistanceToNow } from "date-fns";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RequirePermission } from "@/components/ui/require-permission";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getReviewStatusConfig } from "@/components/review-history-card";
import {
  useMaterialDetails,
  useCancelReview,
  useAcknowledgeInsight,
  useUnacknowledgeInsight,
  useMaterialHistory,
} from "@/api/queries";
import { cn } from "@/lib/utils";
import { components } from "@/types/api";

type ReviewSummary = components["schemas"]["ReviewSummary"];
type Insight = components["schemas"]["Insight"];

// Helper function for currency formatting
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

// Insights Panel Component
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

  const unacknowledgedInsights = insights.filter((i) => !i.acknowledged_at);
  const acknowledgedInsights = insights.filter((i) => i.acknowledged_at);
  const visibleInsights = showAcknowledged ? insights : unacknowledgedInsights;

  const groupedInsights = visibleInsights.reduce((acc, insight) => {
    const type = insight.insight_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

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
    <div className="space-y-2 mb-6">
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

// Info Field Component
function InfoField({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
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

// Change History Component
function ChangeHistorySection({ materialNumber }: { materialNumber: number }) {
  const { data, isLoading } = useMaterialHistory(materialNumber, true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change History</CardTitle>
        <CardDescription>
          Track all changes made to this material's data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No change history available
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {data.map((hist) => (
              <div
                key={hist.history_id}
                className="border-l-4 border-l-blue-500 pl-3 py-2 rounded-l hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(hist.created_at), {
                    addSuffix: true,
                  })}
                </span>
                {hist.fields_changed && hist.fields_changed.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs font-medium mb-1">Changed:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {hist.fields_changed.map((field) => (
                        <li key={field}>
                          - {field.replace(/_/g, " ")}
                          {hist.old_values?.[field] !== undefined &&
                            hist.new_values?.[field] !== undefined &&
                            hist.old_values?.[field] != null &&
                            hist.new_values?.[field] != null && (
                              <span className="text-muted-foreground/70">
                                {" "}
                                ({String(hist.old_values[field])} to{" "}
                                {String(hist.new_values[field])})
                              </span>
                            )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MaterialDetailPage() {
  const { materialNumber: materialNumberParam } = useParams<{
    materialNumber: string;
  }>();
  const navigate = useNavigate();

  const materialNumber = materialNumberParam
    ? parseInt(materialNumberParam, 10)
    : null;

  // State for cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [reviewToCancel, setReviewToCancel] =
    React.useState<ReviewSummary | null>(null);

  // Fetch material details
  const {
    data: materialDetails,
    isLoading,
    isError,
    error,
  } = useMaterialDetails(materialNumber, true);

  // Cancel review mutation
  const cancelReviewMutation = useCancelReview();

  const breadcrumbs = [
    { label: "App", href: "/app" },
    { label: "Dashboard", href: "/app/dashboard" },
    { label: `Material ${materialNumberParam}` },
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const handleStartReview = () => {
    navigate(`/app/materials/${materialNumber}/review`);
  };

  const handleViewReview = (review: ReviewSummary) => {
    navigate(`/app/materials/${materialNumber}/review/${review.review_id}`);
  };

  const handleCancelClick = (review: ReviewSummary) => {
    setReviewToCancel(review);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!materialNumber || !reviewToCancel?.review_id) return;

    try {
      await cancelReviewMutation.mutateAsync({
        materialNumber,
        reviewId: reviewToCancel.review_id,
      });
    } catch (error) {
      console.error("Failed to cancel review:", error);
    }
    setCancelDialogOpen(false);
    setReviewToCancel(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (isError || !materialDetails) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive">
            {error?.message ?? "Failed to load material details"}
          </p>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Prepare data
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
      value: formatDate(materialDetails.created_on, "PPpp"),
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

  const reviewMetrics = [
    {
      label: "Last Review",
      description: "Date when the material was last reviewed.",
      value: materialDetails.last_reviewed
        ? formatDate(materialDetails.last_reviewed, "PP")
        : "Never",
    },
    {
      label: "Next Review",
      description: "Scheduled date for the next material review.",
      value: materialDetails.next_review
        ? formatDate(materialDetails.next_review, "PP")
        : "Not scheduled",
    },
    {
      label: "Total Reviews",
      description: "Total number of reviews conducted for this material.",
      value: materialDetails.reviews?.length?.toLocaleString() ?? "0",
    },
  ];

  const hasActiveReview =
    materialDetails.reviews?.some(
      (review) =>
        review.status &&
        !["cancelled", "approved", "rejected"].includes(review.status)
    ) ?? false;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {materialDetails.material_desc}
              <span className="text-muted-foreground font-normal ml-2">
                (#{materialDetails.material_number})
              </span>
            </h1>
          </div>
          <RequirePermission permission="can_create_reviews" fallback="disable">
            <Button onClick={handleStartReview} disabled={hasActiveReview}>
              <Plus className="mr-2 h-4 w-4" />
              {hasActiveReview ? "Review In Progress" : "Start Review"}
            </Button>
          </RequirePermission>
        </div>
      </div>

      {/* Insights Panel */}
      <InsightsPanel
        insights={materialDetails.insights}
        materialNumber={materialNumber!}
      />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {basicInformation.map((info, index) => (
                  <InfoField
                    key={index}
                    label={info.label}
                    value={info.value}
                    description={info.description}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Metrics */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {inventoryMetrics.map((metric, index) => (
                  <InfoField
                    key={index}
                    label={metric.label}
                    value={metric.value}
                    description={metric.description}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Consumption Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {consumptionMetrics.map((metric, index) => (
                  <InfoField
                    key={index}
                    label={metric.label}
                    value={metric.value}
                    description={metric.description}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 5-Year Consumption Chart */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>5-Year Consumption History</CardTitle>
            </CardHeader>
            <CardContent>
              {materialDetails.consumption_history_5yr &&
              materialDetails.consumption_history_5yr.length > 0 ? (
                <ChartContainer
                  config={{
                    quantity: {
                      label: "Quantity",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  style={{ height: "200px", width: "100%" }}
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
                <p className="text-sm text-muted-foreground text-center py-8">
                  No consumption history available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Status */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Review Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {reviewMetrics.map((metric, index) => (
                <InfoField
                  key={index}
                  label={metric.label}
                  value={metric.value}
                  description={metric.description}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review History */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Review History</CardTitle>
            <CardDescription>
              All reviews conducted for this material.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {materialDetails.reviews && materialDetails.reviews.length > 0 ? (
              <div className="max-h-[32rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Status</TableHead>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Initiated By</TableHead>
                      <TableHead>SME</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...materialDetails.reviews]
                      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
                      .map((review) => {
                        const statusConfig = getReviewStatusConfig(review.status);
                        return (
                          <TableRow key={review.review_id}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("text-xs", statusConfig.badge)}
                              >
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(review.review_date, "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-xs">
                              {review.initiated_by_user?.full_name ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {review.assigned_sme_name ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {review.assigned_approver_name ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {review.final_decision
                                ? review.final_decision.replace(/_/g, " ")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {review.is_read_only ? (
                                  <RequirePermission permission="can_view_all_reviews" fallback="hide">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleViewReview(review)}
                                    >
                                      View
                                    </Button>
                                  </RequirePermission>
                                ) : (
                                  <RequirePermission permission="can_edit_reviews" fallback="hide">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleViewReview(review)}
                                    >
                                      Continue
                                    </Button>
                                  </RequirePermission>
                                )}
                                {!review.is_read_only && (
                                  <RequirePermission permission="can_delete_reviews" fallback="hide">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleCancelClick(review)}
                                    >
                                      Cancel
                                    </Button>
                                  </RequirePermission>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No review history available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change History - Full Width */}
      <div className="mt-6">
        <ChangeHistorySection materialNumber={materialNumber!} />
      </div>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this review? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Review
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Cancel Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
