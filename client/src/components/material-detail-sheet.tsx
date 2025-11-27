import * as React from "react";
import { Info, Loader2, Plus, MessageSquare, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { components } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { MaterialReviewForm } from "@/components/material-review-form";
import { ReviewCommentsDialog } from "@/components/review-comments-dialog";
import { formatDate, formatDistanceToNow } from "date-fns";
import { useMaterialDetails, useCancelReview } from "@/api/queries";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn, getMaterialReviewStatusBadgeColor } from "@/lib/utils";

type MaterialWithReviews = components["schemas"]["MaterialWithReviews"];
type MaterialReviewBase = components["schemas"]["MaterialReview"];
type Insight = components["schemas"]["Insight"];

// Extended type to include fields returned by the API but missing from generated types
type MaterialReview = MaterialReviewBase & {
  review_id?: number | null;
};

// Insights Panel Component
interface InsightsPanelProps {
  insights: Insight[] | undefined;
}

function InsightsPanel({ insights }: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  // Group insights by type
  const groupedInsights = insights.reduce(
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

  const insightConfig: Record<
    string,
    { icon: React.ReactNode; bgColor: string; borderColor: string; textColor: string; label: string }
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
                <ul className="text-xs space-y-1">
                  {typeInsights.map((insight, idx) => (
                    <li key={idx}>{insight.message}</li>
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

interface MaterialDetailSheetProps {
  materialNumber: number | null;
  materialDescription: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Review History Timeline Component
interface ReviewHistoryTimelineProps {
  reviews: MaterialReview[] | undefined;
  isReviewMode: boolean;
  onPerformReview: () => void;
  onEditReview: (review: MaterialReview) => void;
  onCancelReview: (review: MaterialReview) => void;
  disabled: boolean;
}

function ReviewHistoryTimeline({
  reviews,
  isReviewMode,
  onPerformReview,
  onEditReview,
  onCancelReview,
  disabled = false,
}: ReviewHistoryTimelineProps) {
  const [cancelDialogOpen, setCancelDialogOpen] =
    React.useState<boolean>(false);
  const [reviewToCancel, setReviewToCancel] =
    React.useState<MaterialReview | null>(null);

  const handleCancelClick = (review: MaterialReview) => {
    setReviewToCancel(review);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (reviewToCancel) {
      onCancelReview(reviewToCancel);
    }
    setCancelDialogOpen(false);
    setReviewToCancel(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center mb-4">
        <Button
          className="w-full items-center"
          size="sm"
          onClick={onPerformReview}
          disabled={disabled || isReviewMode}
        >
          <Plus />
          {isReviewMode ? "Review In Progress..." : "Start Review"}
        </Button>
      </div>
      {reviews && reviews.length > 0 ? (
        <div className="relative overflow-y-auto pr-2 flex-1">
          {/* Timeline line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-border" />

          {/* Timeline items */}
          <div className="space-y-6">
            {[...reviews]
              .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
              .map((review: MaterialReview, index: number) => {
                return (
                  <div key={index} className="relative flex gap-4 group">
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-background border-2 border-border" />
                    </div>

                    {/* Review card */}
                    <div className="flex-1 rounded-md border p-3 space-y-2 bg-card">
                      <div className="flex items-start justify-between">
                        <div className="space-y-4 flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <p className="text-sm font-medium">
                              Initiated by:{" "}
                              <strong className="capitalize">
                                {review.initiated_by_user?.full_name ??
                                  "Unknown"}
                              </strong>
                            </p>
                            <p className="text-sm font-medium">
                              Decided by:{" "}
                              <strong className="capitalize">
                                {review.decided_by_user?.full_name ??
                                  "No Decision"}
                              </strong>
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Created On
                              </p>
                              <div className="flex gap-2">
                                <p className="text-xs font-medium">
                                  {formatDate(review.created_at, "PP")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  (
                                  {formatDistanceToNow(review.created_at, {
                                    addSuffix: true,
                                  })}
                                  )
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Last Updated
                              </p>
                              <div className="flex gap-2">
                                <p className="text-xs font-medium">
                                  {formatDate(review.updated_at, "PP")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  (
                                  {formatDistanceToNow(review.updated_at, {
                                    addSuffix: true,
                                  })}
                                  )
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Final Decision
                                </p>
                                <p className="text-xs capitalize">
                                  {review.final_decision ?? "None provided"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Final Qty. Adj.
                                </p>
                                <p className="text-xs capitalize">
                                  {review.final_qty_adjustment?.toLocaleString() ??
                                    "None provided"}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Final Notes
                              </p>
                              <p className="text-xs">
                                {review.final_notes ?? "None provided"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between w-full">
                        <div className="flex gap-2 items-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              getMaterialReviewStatusBadgeColor(review.status)
                            )}
                          >
                            {review.status
                              .replace("_", " ")
                              .replace("sme", "SME")}
                          </Badge>
                          {review.comments_count != null &&
                            review.comments_count > 0 && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                <MessageSquare className="h-3 w-3" />
                                {review.comments_count}
                              </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                          <span
                            className="text-xs text-muted-foreground underline cursor-pointer"
                            onClick={() => onEditReview(review)}
                          >
                            {review.is_read_only
                              ? "Show Details"
                              : "Continue Review"}
                          </span>
                          {!review.is_read_only && (
                            <span
                              className="text-xs text-destructive underline cursor-pointer"
                              onClick={() => handleCancelClick(review)}
                            >
                              Cancel Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          No review history available
        </p>
      )}

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
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Internal component for rendering material details
interface MaterialDetailsContentProps {
  materialNumber: number;
  materialDescription: string | null;
  materialDetails: MaterialWithReviews | null | undefined;
  loading: boolean;
  isError: boolean;
  error: Error | null;
  isReviewMode: boolean;
  onPerformReview: () => void;
  onEditReview: (review: MaterialReview) => void;
  onCancelReview: (review: MaterialReview) => void;
}

function MaterialDetailsContent({
  materialNumber,
  materialDescription,
  materialDetails,
  loading,
  isError,
  error,
  isReviewMode,
  onPerformReview,
  onEditReview,
  onCancelReview,
}: MaterialDetailsContentProps) {
  const [commentsDialogOpen, setCommentsDialogOpen] = React.useState(false);

  // Get the most recent review for comments
  const mostRecentReview = React.useMemo(() => {
    if (!materialDetails?.reviews || materialDetails.reviews.length === 0) {
      return null;
    }
    return [...materialDetails.reviews].sort((a, b) =>
      a.created_at! < b.created_at! ? 1 : -1
    )[0];
  }, [materialDetails]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  };

  const basicInformation = [
    {
      label: "Material Number",
      description: "Unique ID/part number for each material.",
      value: materialDetails?.material_number || "N/A",
    },
    {
      label: "Description",
      description: "Name/description of the material.",
      value: materialDetails?.material_desc || "N/A",
    },
    {
      label: "Type",
      description:
        "Category or classification of the material.\n- ANAM: Ancillary Materials\n- CHEM: Chemicals\n- CORE: Core/Critical Components\n- FING: Finished Goods\n- INSRV: In-Service Items\n- OPER: Operating Supplies\n- RAWM: Raw Materials\n- ROTG: Rotables\n- RSTK: Repairable Stock\n- SPRS: Spares",
      value: materialDetails?.material_type || "N/A",
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
        materialDetails?.total_quantity?.toLocaleString() ?? "Not Available",
    },
    {
      label: "Total Value",
      description: "Monetary value of total inventory (Qty x Unit Price).",
      value: formatCurrency(materialDetails?.total_value || 0),
    },
    {
      label: "Unit Value",
      description:
        "The value per unit of the material, calculated as Total Value divided by Total Quantity.",
      value: formatCurrency(materialDetails?.unit_value || 0),
    },

    {
      label: "Unrestricted Quantity",
      description:
        "Available quantity for use without restrictions (not reserved, not allocated, etc.).",
      value:
        materialDetails?.unrestricted_quantity?.toLocaleString() ??
        "Not Available",
    },
    {
      label: "Safety Stock",
      description: "Minimum inventory level to prevent stockouts.",
      value: materialDetails?.safety_stock?.toLocaleString() ?? "Not Available",
    },
  ];

  const consumptionProcurementMetrics = [
    {
      label: "Coverage Ratio",
      description:
        "Current stock divided by average 3-year consumption (shows months/years of supply).",
      value:
        materialDetails?.coverage_ratio?.toLocaleString() ?? "Not Available",
    },
    {
      label: "Max Consumption Demand",
      description:
        "Highest value between consumption average and 12-month demand.",
      value:
        materialDetails?.max_cons_demand?.toLocaleString() ?? "Not Available",
    },
    {
      label: "Purchase Quantity (Last 2 Years)",
      description:
        "Total quantity of the material purchased in the last 2 years.",
      value:
        materialDetails?.purchased_qty_2y?.toLocaleString() ?? "Not Available",
    },
  ];

  const reviewMetrics = [
    {
      label: "Last Review",
      description: "Date when the material was last reviewed.",
      value: materialDetails?.last_reviewed
        ? formatDate(materialDetails.last_reviewed, "PP")
        : "N/A",
    },
    {
      label: "Next Review",
      description: "Scheduled date for the next material review.",
      value: materialDetails?.next_review
        ? formatDate(materialDetails.next_review, "PP")
        : "N/A",
    },
    {
      label: "Total Reviews",
      description: "Total number of reviews conducted for this material.",
      value:
        materialDetails?.reviews?.length?.toLocaleString() ?? "Not Available",
    },
  ];

  const hasActiveReview =
    materialDetails?.reviews?.some(
      (review) =>
        review.status && !["cancelled", "completed"].includes(review.status)
    ) ?? false;

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="sticky top-0">
        <SheetTitle>
          <div className="flex items-center gap-4">
            {/* <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ChevronUp />
              </Button>
              <Button variant="outline" size="sm">
                <ChevronDown />
              </Button>
            </div> */}
            {materialDescription}{" "}
            <span className="text-muted-foreground">(#{materialNumber})</span>
          </div>
        </SheetTitle>
      </SheetHeader>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="mt-6">
          <div className="rounded-md bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Error loading details:{" "}
              {error?.message ?? "Failed to fetch material details"}
            </p>
          </div>
        </div>
      ) : materialDetails ? (
        <div className="mt-6 flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pb-8 pr-2">
          {/* Insights Panel - displayed prominently at the top */}
          <InsightsPanel insights={materialDetails.insights} />

          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 border-t border-gray-300" />
              <h3 className="text-md font-semibold whitespace-nowrap">
                Basic Information
              </h3>
              <div className="flex-1 border-t border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {basicInformation.map((info, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {info.label}
                    </p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px] whitespace-pre-line">
                          {info.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium">{info.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 border-t border-gray-300" />
              <h3 className="text-md font-semibold whitespace-nowrap">
                Inventory
              </h3>
              <div className="flex-1 border-t border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {inventoryMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {metric.label}
                    </p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px] whitespace-pre-line">
                          {metric.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 border-t border-gray-300" />
              <h3 className="text-md font-semibold whitespace-nowrap">
                Consumption
              </h3>
              <div className="flex-1 border-t border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {consumptionProcurementMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {metric.label}
                    </p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px] whitespace-pre-line">
                          {metric.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 border-t border-gray-300" />
              <h3 className="text-md font-semibold whitespace-nowrap">
                5-Year Consumption History
              </h3>
              <div className="flex-1 border-t border-gray-300" />
            </div>
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

          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 border-t border-gray-300" />
              <h3 className="text-md font-semibold whitespace-nowrap">
                Review History
              </h3>
              <div className="flex-1 border-t border-gray-300" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {reviewMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {metric.label}
                    </p>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px] whitespace-pre-line">
                          {metric.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium">{metric.value}</p>
                </div>
              ))}
            </div>
            <ReviewHistoryTimeline
              reviews={materialDetails.reviews}
              isReviewMode={isReviewMode}
              onPerformReview={onPerformReview}
              onEditReview={onEditReview}
              onCancelReview={onCancelReview}
              disabled={hasActiveReview}
            />
          </div>
        </div>
      ) : null}

      {/* Comments dialog */}
      {mostRecentReview && (
        <ReviewCommentsDialog
          materialNumber={materialNumber}
          reviewId={mostRecentReview.review_id || 0}
          isOpen={commentsDialogOpen}
          onOpenChange={setCommentsDialogOpen}
          hideInput={true}
        />
      )}
    </div>
  );
}

export function MaterialDetailSheet({
  materialNumber,
  materialDescription,
  isOpen,
  onOpenChange,
}: MaterialDetailSheetProps) {
  const [isReviewMode, setIsReviewMode] = React.useState<boolean>(false);
  const [editingReview, setEditingReview] =
    React.useState<MaterialReview | null>(null);

  // Fetch material details using React Query
  const {
    data: materialDetails,
    isLoading: loading,
    isError,
    error,
  } = useMaterialDetails(materialNumber, isOpen);

  // Cancel review mutation
  const cancelReviewMutation = useCancelReview();

  // Reset review mode when sheet closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsReviewMode(false);
      setEditingReview(null);
    }
  }, [isOpen]);

  const handlePerformReview = () => {
    // Toggle review mode to show the form
    setEditingReview(null);
    setIsReviewMode(true);
  };

  const handleEditReview = (review: MaterialReview) => {
    // Enter edit mode with the selected review
    setEditingReview(review);
    setIsReviewMode(true);
  };

  const handleCancelReview = async (review: MaterialReview) => {
    if (!materialNumber || !review.review_id) return;

    try {
      await cancelReviewMutation.mutateAsync({
        materialNumber,
        reviewId: review.review_id,
      });
    } catch (error) {
      console.error("Failed to cancel review:", error);
    }
  };

  const handleReviewSubmit = () => {
    // Exit review mode (mutation in form will handle invalidation)
    setIsReviewMode(false);
    setEditingReview(null);
  };

  const handleReviewClose = () => {
    // Exit review mode without submitting
    setIsReviewMode(false);
    setEditingReview(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        className={`${
          isReviewMode
            ? "min-w-[1200px] max-w-[1200px] p-0"
            : "min-w-[600px] overflow-y-auto"
        }`}
      >
        {materialNumber && (
          <>
            {isReviewMode ? (
              /* Dual-panel layout */
              <div className="flex h-full">
                {/* Left panel - Review Form */}
                <div className="w-1/2 overflow-y-auto p-6 border-r">
                  <MaterialReviewForm
                    materialData={materialDetails}
                    existingReview={editingReview}
                    onSubmit={handleReviewSubmit}
                    onClose={handleReviewClose}
                  />
                </div>
                {/* Right panel - Material Details */}
                <div className="w-1/2 overflow-y-auto p-6">
                  <MaterialDetailsContent
                    materialNumber={materialNumber}
                    materialDescription={materialDescription}
                    materialDetails={materialDetails}
                    loading={loading}
                    isError={isError}
                    error={error}
                    isReviewMode={isReviewMode}
                    onPerformReview={handlePerformReview}
                    onEditReview={handleEditReview}
                    onCancelReview={handleCancelReview}
                  />
                </div>
              </div>
            ) : (
              /* Single-panel layout */
              <MaterialDetailsContent
                materialNumber={materialNumber}
                materialDescription={materialDescription}
                materialDetails={materialDetails}
                loading={loading}
                isError={isError}
                error={error}
                isReviewMode={isReviewMode}
                onPerformReview={handlePerformReview}
                onEditReview={handleEditReview}
                onCancelReview={handleCancelReview}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
