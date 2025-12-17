import { formatDate, formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RequirePermission } from "@/components/ui/require-permission";
import { cn } from "@/lib/utils";
import { components } from "@/types/api";

type ReviewSummary = components["schemas"]["ReviewSummary"];

interface ReviewHistoryCardProps {
  review: ReviewSummary;
  materialNumber: number;
  onView: (review: ReviewSummary) => void;
  onCancel?: (review: ReviewSummary) => void;
}

function getStatusConfig(status: string): {
  badge: string;
  label: string;
} {
  switch (status.toLowerCase()) {
    case "draft":
      return {
        badge: "bg-yellow-500/10 text-yellow-700 border-yellow-500/50",
        label: "Draft",
      };
    case "pending_assignment":
      return {
        badge: "bg-orange-500/10 text-orange-700 border-orange-500/50",
        label: "Pending Assignment",
      };
    case "pending_sme":
      return {
        badge: "bg-blue-500/10 text-blue-700 border-blue-500/50",
        label: "Pending SME",
      };
    case "pending_decision":
      return {
        badge: "bg-purple-500/10 text-purple-700 border-purple-500/50",
        label: "Pending Decision",
      };
    case "approved":
      return {
        badge: "bg-green-500/10 text-green-700 border-green-500/50",
        label: "Approved",
      };
    case "rejected":
      return {
        badge: "bg-red-500/10 text-red-700 border-red-500/50",
        label: "Rejected",
      };
    case "cancelled":
      return {
        badge: "bg-red-500/10 text-red-700 border-red-500/50",
        label: "Cancelled",
      };
    default:
      return {
        badge: "bg-gray-500/10 text-gray-700 border-gray-500/50",
        label: status,
      };
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function ReviewHistoryCard({
  review,
  onView,
  onCancel,
}: ReviewHistoryCardProps) {
  const statusConfig = getStatusConfig(review.status);
  const hasDecisionDetails =
    review.final_decision ||
    review.final_safety_stock_qty != null ||
    review.final_unrestricted_qty != null;

  const initiatorName = review.initiated_by_user?.full_name ?? "Unknown";
  const deciderName = review.decided_by_user?.full_name;

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors space-y-3">
      {/* Header: Status + Date + Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn("font-medium", statusConfig.badge)}
          >
            {statusConfig.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(review.review_date, "PPP")}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(review.created_at, { addSuffix: true })}
        </span>
      </div>

      {/* People row */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(initiatorName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <span className="text-muted-foreground">Initiated by </span>
            <span className="font-medium">{initiatorName}</span>
          </div>
        </div>

        {deciderName && (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs font-medium bg-green-500/10 text-green-700">
                {getInitials(deciderName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <span className="text-muted-foreground">Decided by </span>
              <span className="font-medium">{deciderName}</span>
            </div>
          </div>
        )}

        {review.comments_count != null && review.comments_count > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-auto">
            <MessageSquare className="h-4 w-4" />
            {review.comments_count}
          </div>
        )}
      </div>

      {/* Decision details (if present) */}
      {hasDecisionDetails && (
        <div className="flex items-center gap-4 text-sm bg-muted/50 rounded-md px-3 py-2">
          {review.final_decision && (
            <div>
              <span className="text-muted-foreground">Decision: </span>
              <span className="font-medium capitalize">
                {review.final_decision.replace(/_/g, " ")}
              </span>
            </div>
          )}
          {review.final_safety_stock_qty != null && (
            <div>
              <span className="text-muted-foreground">Safety Stock: </span>
              <span className="font-medium">
                {review.final_safety_stock_qty.toLocaleString()}
              </span>
            </div>
          )}
          {review.final_unrestricted_qty != null && (
            <div>
              <span className="text-muted-foreground">Unrestricted: </span>
              <span className="font-medium">
                {review.final_unrestricted_qty.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        {review.is_read_only ? (
          <Button variant="outline" size="sm" onClick={() => onView(review)}>
            View Details
          </Button>
        ) : (
          <RequirePermission permission="can_edit_reviews" fallback="hide">
            <Button variant="default" size="sm" onClick={() => onView(review)}>
              Continue Review
            </Button>
          </RequirePermission>
        )}
        {!review.is_read_only && onCancel && (
          <RequirePermission permission="can_delete_reviews" fallback="hide">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onCancel(review)}
            >
              Cancel
            </Button>
          </RequirePermission>
        )}
      </div>
    </div>
  );
}
