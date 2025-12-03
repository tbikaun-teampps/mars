import * as React from "react";
import {
  Info,
  Loader2,
  Plus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  Eye,
  EyeOff,
  History,
} from "lucide-react";
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
import {
  useMaterialDetails,
  useCancelReview,
  useAcknowledgeInsight,
  useUnacknowledgeInsight,
  useMaterialHistory,
} from "@/api/queries";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "@/lib/utils";

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
  materialNumber: number;
}

function InsightsPanel({ insights, materialNumber }: InsightsPanelProps) {
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

// Helper functions for status-based coloring
function getStatusColors(status: string): { border: string; badge: string } {
  switch (status.toLowerCase()) {
    case "draft":
      return {
        border: "border-l-yellow-500",
        badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500",
      };
    case "pending_sme":
      return {
        border: "border-l-blue-500",
        badge: "bg-blue-500/10 text-blue-600 border-blue-500",
      };
    case "pending_decision":
      return {
        border: "border-l-purple-500",
        badge: "bg-purple-500/10 text-purple-600 border-purple-500",
      };
    case "completed":
      return {
        border: "border-l-green-500",
        badge: "bg-green-500/10 text-green-600 border-green-500",
      };
    case "cancelled":
      return {
        border: "border-l-red-500",
        badge: "bg-red-500/10 text-red-600 border-red-500",
      };
    default:
      return {
        border: "border-l-gray-500",
        badge: "bg-gray-500/10 text-gray-600 border-gray-500",
      };
  }
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
        <div className="overflow-y-auto pr-2 flex-1 space-y-3">
          {[...reviews]
            .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
            .map((review: MaterialReview, index: number) => {
              const statusColors = getStatusColors(review.status);
              return (
                <div key={index} className="group">
                  {/* Review content with colored left border */}
                  <div
                    className={cn(
                      "flex-1 pl-4 py-2 border-l-4 rounded-l hover:bg-muted/50 transition-colors space-y-2",
                      statusColors.border
                    )}
                  >
                    {/* Row 1: Status badge + timestamps */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", statusColors.badge)}
                      >
                        {review.status.replace("_", " ").replace("sme", "SME")}
                      </Badge>
                      <span className="text-muted-foreground">
                        Created {formatDate(review.created_at, "PP")}{" "}
                        <span className="opacity-70">
                          (
                          {formatDistanceToNow(review.created_at, {
                            addSuffix: true,
                          })}
                          )
                        </span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        Updated {formatDate(review.updated_at, "PP")}{" "}
                        <span className="opacity-70">
                          (
                          {formatDistanceToNow(review.updated_at, {
                            addSuffix: true,
                          })}
                          )
                        </span>
                      </span>
                    </div>

                    {/* Row 2: People + comments */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>
                        <span className="text-muted-foreground">
                          Initiated by:
                        </span>{" "}
                        <span className="font-medium capitalize">
                          {review.initiated_by_user?.full_name ?? "Unknown"}
                        </span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span>
                        <span className="text-muted-foreground">
                          Decided by:
                        </span>{" "}
                        <span className="font-medium capitalize">
                          {review.decided_by_user?.full_name ?? "—"}
                        </span>
                      </span>
                      {review.comments_count != null &&
                        review.comments_count > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-muted-foreground">
                                Comments:
                              </span>{" "}
                              {review.comments_count}
                            </span>
                          </>
                        )}
                    </div>

                    {/* Row 3: Decision details */}
                    {(review.final_decision ||
                      review.final_qty_adjustment != null ||
                      review.final_notes ||
                      (review.comments_count != null &&
                        review.comments_count > 0)) && (
                      <div className="flex flex-wrap items-start gap-x-4 gap-y-1 text-xs">
                        {review.final_decision && (
                          <span>
                            <span className="text-muted-foreground">
                              Decision:
                            </span>{" "}
                            <span className="capitalize">
                              {review.final_decision}
                            </span>
                          </span>
                        )}
                        {review.final_qty_adjustment != null && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-muted-foreground">
                                Qty Adj:
                              </span>{" "}
                              {review.final_qty_adjustment.toLocaleString()}
                            </span>
                          </>
                        )}
                        {review.final_notes && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="flex-1 min-w-0">
                              <span className="text-muted-foreground">
                                Notes:
                              </span>{" "}
                              <span className="truncate">
                                {review.final_notes}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Row 4: Actions */}
                    <div className="flex justify-end items-center pt-1">
                      <div className="flex gap-3">
                        <span
                          className="text-xs text-primary hover:underline cursor-pointer"
                          onClick={() => onEditReview(review)}
                        >
                          {review.is_read_only
                            ? "Show Details"
                            : "Continue Review"}
                        </span>
                        {!review.is_read_only && (
                          <span
                            className="text-xs text-destructive hover:underline cursor-pointer"
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

function ChangeHistory({ materialNumber }: { materialNumber: number }) {
  const { data, isLoading } = useMaterialHistory(materialNumber, true);


  return (
    <div className="mt-6">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <History className="h-4 w-4" />
        Change History
      </h4>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history available</p>
      ) : (
        <div className="overflow-y-auto max-h-64 space-y-3 pr-2">
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
                          hist.new_values?.[field] !== undefined && (
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
  const [commentsDialogOpen, setCommentsDialogOpen] =
    React.useState<boolean>(false);
  const [showHistory, setShowHistory] = React.useState<boolean>(false);

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
          <div className="flex justify-between mr-6 gap-4">
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
            <Button
              size="sm"
              variant={showHistory ? "default" : "outline"}
              onClick={() => setShowHistory(!showHistory)}
            >
              <History />
              Change History
            </Button>
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
      ) : showHistory ? (
        <ChangeHistory materialNumber={materialNumber!} />
      ) : materialDetails ? (
        <>
          {/* Insights Panel - fixed at top, does not scroll */}
          <div className="mt-6 flex-shrink-0">
            <InsightsPanel
              insights={materialDetails.insights}
              materialNumber={materialNumber!}
            />
          </div>

          {/* Scrollable content */}
          <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pb-8 pr-2">
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
        </>
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
