import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ShieldX, X } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { MaterialReviewForm } from "@/components/material-review-form";
import { MaterialDetailsPanel } from "@/components/material-details-panel";
import { useMaterialDetails, useReviewDetails, useCancelReview } from "@/api/queries";
import { usePermissions } from "@/hooks/use-permissions";

export function MaterialReviewPage() {
  const { materialNumber: materialNumberParam, reviewId: reviewIdParam } =
    useParams();
  const navigate = useNavigate();

  // Parse route params
  const materialNumber = materialNumberParam
    ? parseInt(materialNumberParam, 10)
    : null;
  const reviewId = reviewIdParam ? parseInt(reviewIdParam, 10) : null;

  // Fetch material details (now returns ReviewSummary, not full reviews)
  const {
    data: materialDetails,
    isLoading: materialLoading,
    isError: materialError,
    error: materialErrorObj,
  } = useMaterialDetails(materialNumber, true);

  // Fetch full review details if editing an existing review
  const {
    data: existingReview,
    isLoading: reviewLoading,
    isError: reviewError,
    error: reviewErrorObj,
  } = useReviewDetails(materialNumber, reviewId);

  // Permission check
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const requiredPermission = reviewId ? "can_edit_reviews" : "can_create_reviews";
  const hasRequiredPermission = hasPermission(requiredPermission);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const cancelReviewMutation = useCancelReview();

  // Handlers
  const handleReviewComplete = () => {
    navigate(`/app/materials/${materialNumber}`);
  };

  const handleBack = () => {
    navigate(`/app/materials/${materialNumber}`);
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!materialNumber || !reviewId) return;

    try {
      await cancelReviewMutation.mutateAsync({
        materialNumber,
        reviewId,
      });
      navigate(`/app/materials/${materialNumber}`);
    } catch (error) {
      console.error("Failed to cancel review:", error);
    }
    setCancelDialogOpen(false);
  };

  // Update URL when a new review is created (without full page reload)
  const handleReviewCreated = (newReviewId: number) => {
    navigate(`/app/materials/${materialNumber}/review/${newReviewId}`, { replace: true });
  };

  // Breadcrumbs for page
  const breadcrumbs = [
    { label: "App", href: "/app" },
    { label: "Dashboard", href: "/app/dashboard" },
    {
      label: `Material ${materialNumber}`,
      href: `/app/materials/${materialNumber}`,
    },
    { label: reviewId ? "Edit Review" : "New Review" },
  ];

  // Loading state (wait for material, permissions, and review if editing)
  const isLoading = materialLoading || permissionsLoading || (reviewId && reviewLoading);
  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Access denied state
  if (!hasRequiredPermission) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="rounded-md bg-destructive/10 p-6 max-w-md text-center">
            <ShieldX className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have permission to {reviewId ? "edit reviews" : "create reviews"}.
              Contact your administrator if you believe this is an error.
            </p>
            <Button variant="outline" onClick={handleBack}>
              Return to Material
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state (material or review fetch failed)
  const isError = materialError || reviewError;
  const errorMessage = materialErrorObj?.message || reviewErrorObj?.message || "Failed to load data";
  if (isError || !materialNumber) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="rounded-md bg-destructive/10 p-6 max-w-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/app/dashboard")}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If editing and review not found
  if (reviewId && !existingReview && materialDetails) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="rounded-md bg-destructive/10 p-6 max-w-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Review not found. It may have been deleted or cancelled.
              </p>
            </div>
            <Button variant="outline" className="mt-4" onClick={handleBack}>
              Return to Material
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Extract user context for role guidance (cast needed until types regenerated)
  type UserReviewContext = {
    role: string;
    editable_steps: number[];
    guidance?: string | null;
  };
  const userContext = (existingReview as { user_context?: UserReviewContext } | undefined)?.user_context;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Header - matches MaterialDetailPage style */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold truncate min-w-0">
          {reviewId ? "Editing review for " : "Creating new review for "}
          <span className="truncate">{materialDetails?.material_desc}</span>
          <span className="text-muted-foreground font-normal ml-2 whitespace-nowrap">
            (#{materialNumber})
          </span>
        </h1>
        {/* Role guidance badge */}
        {userContext?.guidance && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-sm py-1 px-3 cursor-help">
                {userContext.role && (
                  <span className="font-medium capitalize mr-1">{userContext.role}:</span>
                )}
                {userContext.guidance}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">
                Your assigned role determines which steps you can edit in this review.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Dual-panel layout */}
      <div className="flex gap-6">
        {/* Left panel - Review Form (wider) */}
        <Card className="w-4/5 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto">
            <MaterialReviewForm
              materialData={materialDetails}
              existingReview={existingReview}
              onSubmit={handleReviewComplete}
              onReviewCreated={handleReviewCreated}
            />
          </CardContent>
        </Card>

        {/* Right panel - Material Details Reference (skinny sidebar) */}
        <div className="w-1/5 flex flex-col gap-4">
          <Button
            variant="destructive"
            onClick={reviewId ? handleCancelClick : handleBack}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 overflow-y-auto">
              <MaterialDetailsPanel
                materialDetails={materialDetails}
                loading={materialLoading}
                isError={materialError}
                error={materialErrorObj}
                compact
              />
            </CardContent>
          </Card>
        </div>
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
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelReviewMutation.isPending}
            >
              {cancelReviewMutation.isPending ? "Cancelling..." : "Cancel Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
