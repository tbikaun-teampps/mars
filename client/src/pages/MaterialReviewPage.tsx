import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, ShieldX } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialReviewForm } from "@/components/material-review-form";
import { MaterialDetailsPanel } from "@/components/material-details-panel";
import { useMaterialDetails, useReviewDetails } from "@/api/queries";
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

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {reviewId ? "Edit Review" : "New Review"}
          </h1>
          <p className="text-muted-foreground">
            {materialDetails?.material_desc} (#{materialNumber})
          </p>
        </div>
      </div>

      {/* Dual-panel layout */}
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Left panel - Review Form */}
        <Card className="w-1/2 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Review Form</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <MaterialReviewForm
              materialData={materialDetails}
              existingReview={existingReview}
              onSubmit={handleReviewComplete}
              onClose={handleClose}
            />
          </CardContent>
        </Card>

        {/* Right panel - Material Details Reference */}
        <Card className="w-1/2 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Material Reference</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <MaterialDetailsPanel
              materialDetails={materialDetails}
              loading={materialLoading}
              isError={materialError}
              error={materialErrorObj}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
