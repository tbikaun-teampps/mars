import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, ShieldX } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { MaterialReviewForm } from "@/components/material-review-form";
import { MaterialDetailsPanel } from "@/components/material-details-panel";
import { useMaterialDetails } from "@/api/queries";
import { usePermissions } from "@/hooks/use-permissions";
import { components } from "@/types/api";

type MaterialReview = components["schemas"]["MaterialReview"];

export function MaterialReviewPage() {
  const { materialNumber: materialNumberParam, reviewId: reviewIdParam } =
    useParams();
  const navigate = useNavigate();

  // Parse route params
  const materialNumber = materialNumberParam
    ? parseInt(materialNumberParam, 10)
    : null;
  const reviewId = reviewIdParam ? parseInt(reviewIdParam, 10) : null;

  // Fetch material details
  const {
    data: materialDetails,
    isLoading,
    isError,
    error,
  } = useMaterialDetails(materialNumber, true);

  // Find existing review if reviewId provided
  const existingReview = React.useMemo((): MaterialReview | null => {
    if (!reviewId || !materialDetails?.reviews) return null;
    return (
      materialDetails.reviews.find((r) => r.review_id === reviewId) || null
    );
  }, [reviewId, materialDetails]);

  // Permission check
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const requiredPermission = reviewId ? "can_edit_reviews" : "can_create_reviews";
  const hasRequiredPermission = hasPermission(requiredPermission);

  // Handlers
  const handleReviewComplete = () => {
    navigate(`/app/materials/${materialNumber}`);
  };

  const handleClose = () => {
    navigate(-1); // Go back
  };

  const handleBack = () => {
    navigate(`/app/materials/${materialNumber}`);
  };

  // Breadcrumbs for page
  const breadcrumbs = [
    { label: "Dashboard", href: "/app/dashboard" },
    {
      label: `Material ${materialNumber}`,
      href: `/app/materials/${materialNumber}`,
    },
    { label: reviewId ? "Edit Review" : "New Review" },
  ];

  // Loading state
  if (isLoading || permissionsLoading) {
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

  // Error state
  if (isError || !materialNumber) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="rounded-md bg-destructive/10 p-6 max-w-md">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                {error?.message || "Failed to load material details"}
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

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Material
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg font-semibold">
                {reviewId ? "Edit Review" : "New Review"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {materialDetails?.material_desc} (#{materialNumber})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dual-panel layout */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* Left panel - Review Form */}
        <div className="w-1/2 overflow-y-auto p-6 border-r">
          <MaterialReviewForm
            materialData={materialDetails}
            existingReview={existingReview}
            onSubmit={handleReviewComplete}
            onClose={handleClose}
          />
        </div>

        {/* Right panel - Material Details Reference */}
        <div className="w-1/2 overflow-y-auto p-6 bg-muted/30">
          <MaterialDetailsPanel
            materialDetails={materialDetails}
            loading={isLoading}
            isError={isError}
            error={error}
          />
        </div>
      </div>
    </AppLayout>
  );
}
