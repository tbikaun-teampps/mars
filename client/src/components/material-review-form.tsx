import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { components } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { apiClient, MaterialReviewUpdate } from "@/api/client";
import { queryKeys } from "@/api/query-keys";
import { useReviewComments, useLookupOptions } from "@/api/queries";
import {
  MultiStepFormProvider,
  Step,
  StepContent,
  useMultiStepForm,
} from "./multi-step-form";
import { StepProgressIndicator } from "./step-progress-indicator";
import { Step1GeneralInfo } from "./review-steps/step1-general-info";
import { Step2Checklist } from "./review-steps/step2-checklist";
import { Step3SMEInvestigation } from "./review-steps/step3-sme-investigation";
import { Step4FollowUp } from "./review-steps/step4-follow-up";
import { Step5FinalDecision } from "./review-steps/step5-final-decision";
import { ReviewCommentsDialog } from "./review-comments-dialog";
import { Badge } from "./ui/badge";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step3RequiredSchema,
  step4Schema,
  step5Schema,
  CombinedMaterialReviewSchema,
  type MaterialReviewFormData,
} from "@/validators/material-review-flow.validator";
import { toast } from "sonner";

type MaterialWithReviews = components["schemas"]["MaterialWithReviews"];
type MaterialReview = components["schemas"]["MaterialReview"];
type MaterialReviewCreate = components["schemas"]["MaterialReviewCreate"];

interface MaterialReviewFormProps {
  materialData: MaterialWithReviews | null | undefined;
  existingReview?: MaterialReview | null;
  onSubmit: () => void;
  onClose: () => void;
}

// Define the steps for the multi-step form
// SME Review is optional when no proposed qty is set for either stock type
const getReviewSteps = (hasProposedQty: boolean): Step[] => [
  { id: "general-info", title: "General Info" },
  { id: "checklist", title: "Checklist" },
  { id: "sme-investigation", title: "SME Review", isOptional: !hasProposedQty },
  { id: "follow-up", title: "Follow-up", isOptional: true },
  { id: "final-decision", title: "Final Decision" },
];

// Default steps for initial render (before form values are available)
const DEFAULT_REVIEW_STEPS: Step[] = getReviewSteps(false);

// Step-specific payload extraction functions
function extractStep1Payload(
  formData: MaterialReviewFormData
): Partial<MaterialReviewUpdate> {
  // If "other" is selected, use the custom reason; otherwise use the selected reason
  const reviewReason =
    formData.reviewReason === "other"
      ? formData.reviewReasonOther || null
      : formData.reviewReason || null;

  return {
    review_reason: reviewReason,
    // current_stock_qty and current_stock_value are captured by the backend from material data
    months_no_movement: formData.monthsNoMovement ?? null,
    proposed_action: formData.proposedAction || null,
    proposed_safety_stock_qty: formData.proposedSafetyStockQty ?? null,
    proposed_unrestricted_qty: formData.proposedUnrestrictedQty ?? null,
    business_justification: formData.businessJustification || null,
  };
}

function extractStep2Payload(
  formData: MaterialReviewFormData
): Partial<MaterialReviewUpdate> {
  return {
    has_open_orders: formData.hasOpenOrders,
    has_forecast_demand: formData.hasForecastDemand,
    checked_alternate_plants: formData.checkedAlternativePlants,
    contacted_procurement: formData.contactedProcurement,
    reviewed_bom_usage: formData.reviewedBomUsage,
    checked_supersession: formData.checkedSupersession,
    checked_historical_usage: formData.checkedHistoricalUsage,
    open_order_numbers: formData.openOrderNumbers || "",
    forecast_next_12m: formData.forecastNext12m ?? null,
    alternate_plant_qty: formData.alternatePlantQty ?? null,
    procurement_feedback: formData.procurementFeedback || null,
  } as Partial<MaterialReviewUpdate>;
}

function extractStep3Payload(
  formData: MaterialReviewFormData
): Partial<MaterialReviewUpdate> {
  return {
    sme_name: formData.smeName || null,
    sme_email: formData.smeEmail || null,
    sme_department: formData.smeDepartment || null,
    sme_feedback_method: formData.smeFeedbackMethod || null,
    sme_contacted_date: formData.smeContactedDate
      ? new Date(formData.smeContactedDate).toISOString()
      : null,
    sme_responded_date: formData.smeRespondedDate
      ? new Date(formData.smeRespondedDate).toISOString()
      : null,
    sme_recommendation: formData.smeRecommendation || null,
    sme_recommended_safety_stock_qty: formData.smeRecommendedSafetyStockQty ?? null,
    sme_recommended_unrestricted_qty: formData.smeRecommendedUnrestrictedQty ?? null,
    sme_analysis: formData.smeAnalysis || null,
    alternative_applications: formData.smeAlternativeApplications || null,
    risk_assessment: formData.smeRiskAssessment || null,
  };
}

function extractStep4Payload(
  formData: MaterialReviewFormData
): Partial<MaterialReviewUpdate> {
  return {
    requires_follow_up: formData.scheduleFollowUp || false,
    next_review_date: formData.scheduleFollowUpDate
      ? new Date(formData.scheduleFollowUpDate).toISOString()
      : null,
    follow_up_reason: formData.scheduleFollowUpReason || null,
    review_frequency_weeks: formData.scheduleReviewFrequencyWeeks ?? null,
  };
}

function extractStep5Payload(
  formData: MaterialReviewFormData
): Partial<MaterialReviewUpdate> {
  return {
    final_decision: formData.finalDecision || null,
    final_safety_stock_qty: formData.finalSafetyStockQty ?? null,
    final_unrestricted_qty: formData.finalUnrestrictedQty ?? null,
    final_notes: formData.finalNotes || null,
  };
}

// Main extraction function that routes to the appropriate step
function extractPayloadForStep(
  step: number,
  formData: MaterialReviewFormData
): Partial<MaterialReviewUpdate> {
  const extractors = [
    extractStep1Payload,
    extractStep2Payload,
    extractStep3Payload,
    extractStep4Payload,
    extractStep5Payload,
  ];

  return extractors[step](formData);
}

// Helper function to map MaterialReview API data to MaterialReviewFormData format
function mapReviewToFormData(
  review: MaterialReview,
  predefinedReasons: string[] = ["annual_review", "usage_spike", "supplier_change"]
): MaterialReviewFormData {
  // Check if review_reason is a predefined option or custom
  const existingReason = review.review_reason || "";
  const isCustomReason =
    existingReason && !predefinedReasons.includes(existingReason);

  return {
    // General step
    reviewReason: isCustomReason ? "other" : existingReason,
    reviewReasonOther: isCustomReason ? existingReason : "",
    currentStockQty: review.current_stock_qty ?? undefined,
    currentStockValue: review.current_stock_value ?? undefined,
    monthsNoMovement: review.months_no_movement ?? undefined,
    proposedAction: review.proposed_action || "",
    proposedSafetyStockQty: review.proposed_safety_stock_qty ?? undefined,
    proposedUnrestrictedQty: review.proposed_unrestricted_qty ?? undefined,
    businessJustification: review.business_justification || "",
    // Checklist step
    hasOpenOrders: review.checklist?.has_open_orders ?? undefined,
    hasForecastDemand: review.checklist?.has_forecast_demand ?? undefined,
    checkedAlternativePlants:
      review.checklist?.checked_alternate_plants ?? undefined,
    contactedProcurement: review.checklist?.contacted_procurement ?? undefined,
    reviewedBomUsage: review.checklist?.reviewed_bom_usage ?? undefined,
    checkedSupersession: review.checklist?.checked_supersession ?? undefined,
    checkedHistoricalUsage:
      review.checklist?.checked_historical_usage ?? undefined,
    openOrderNumbers: review.checklist?.open_order_numbers || "",
    forecastNext12m: review.checklist?.forecast_next_12m ?? undefined,
    alternatePlantQty: review.checklist?.alternate_plant_qty ?? undefined,
    procurementFeedback: review.checklist?.procurement_feedback || "",
    // SME step
    smeName: review.sme_name || "",
    smeEmail: review.sme_email || "",
    smeDepartment: review.sme_department || "",
    smeFeedbackMethod: review.sme_feedback_method || "",
    smeContactedDate: review.sme_contacted_date
      ? new Date(review.sme_contacted_date)
      : undefined,
    smeRespondedDate: review.sme_responded_date
      ? new Date(review.sme_responded_date)
      : undefined,
    smeRecommendation: review.sme_recommendation || "",
    smeRecommendedSafetyStockQty: review.sme_recommended_safety_stock_qty ?? undefined,
    smeRecommendedUnrestrictedQty: review.sme_recommended_unrestricted_qty ?? undefined,
    smeAnalysis: review.sme_analysis || "",
    smeAlternativeApplications: review.alternative_applications || "",
    smeRiskAssessment: review.risk_assessment || "",
    // Follow-up step
    scheduleFollowUp: review.requires_follow_up ?? false,
    scheduleFollowUpReason: review.follow_up_reason || "",
    scheduleFollowUpDate: review.next_review_date
      ? new Date(review.next_review_date)
      : undefined,
    scheduleReviewFrequencyWeeks: review.review_frequency_weeks ?? undefined,
    // Final decision step
    finalDecision: review.final_decision || "",
    finalSafetyStockQty: review.final_safety_stock_qty ?? undefined,
    finalUnrestrictedQty: review.final_unrestricted_qty ?? undefined,
    finalNotes: review.final_notes || "",
  };
}

// Inner form component that uses the multi-step context
function MaterialReviewFormInner({
  materialData,
  existingReview,
  onSubmit,
  onClose,
}: MaterialReviewFormProps) {
  const queryClient = useQueryClient();
  const {
    currentStep,
    markStepComplete,
    markStepIncomplete,
    prevStep,
    nextStep,
    totalSteps,
    isStepComplete,
  } = useMultiStepForm();
  const isEditMode = !!existingReview;

  // Check if current step can be saved (all previous steps are completed)
  const canSaveCurrentStep = React.useMemo(() => {
    // Step 0 can always be saved
    if (currentStep === 0) return true;

    // All other steps require previous steps to be completed
    for (let i = 0; i < currentStep; i++) {
      if (!isStepComplete(i)) {
        return false;
      }
    }
    return true;
  }, [currentStep, isStepComplete]);

  // Track the review_id after creation
  const [reviewId, setReviewId] = React.useState<number | null>(
    existingReview?.review_id ?? null
  );

  // Track the last review_id that we reset the form for
  // This prevents the useEffect from resetting the form on every refetch
  const lastResetReviewIdRef = React.useRef<number | null>(null);

  // Comments dialog state
  const [commentsDialogOpen, setCommentsDialogOpen] = React.useState(false);

  // Fetch comment count for badge (only when editing an existing review)
  const { data: commentsData } = useReviewComments(
    materialData?.material_number || null,
    reviewId,
    { skip: 0, limit: 1 },
    isEditMode && !!reviewId // Only fetch when editing and have review ID
  );

  const commentCount = commentsData?.total ?? 0;

  // Fetch review reason options for predefined reasons check
  const { data: reviewReasonOptions } = useLookupOptions("review_reason");
  const predefinedReasons = React.useMemo(() => {
    if (!reviewReasonOptions?.options) {
      // Fallback to hardcoded options if not loaded yet
      return ["annual_review", "usage_spike", "supplier_change"];
    }
    return reviewReasonOptions.options.map((opt) => opt.value);
  }, [reviewReasonOptions]);

  // Initialize form with combined schema (we'll validate per-step)
  const form = useForm<MaterialReviewFormData>({
    resolver: zodResolver(CombinedMaterialReviewSchema),
    mode: "onBlur",
    defaultValues: {
      // General step
      reviewReason: "",
      reviewReasonOther: "",
      // currentStockQty and currentStockValue are captured by backend from material data
      currentStockQty: undefined,
      currentStockValue: undefined,
      monthsNoMovement: undefined,
      proposedAction: "",
      proposedSafetyStockQty: 0,
      proposedUnrestrictedQty: 0,
      businessJustification: "",
      // Checklist step
      hasOpenOrders: undefined,
      hasForecastDemand: undefined,
      checkedAlternativePlants: undefined,
      contactedProcurement: undefined,
      reviewedBomUsage: undefined,
      checkedSupersession: undefined,
      checkedHistoricalUsage: undefined,
      openOrderNumbers: "",
      forecastNext12m: undefined,
      alternatePlantQty: undefined,
      procurementFeedback: "",
      // SME step
      smeName: "",
      smeEmail: "",
      smeDepartment: "",
      smeFeedbackMethod: "",
      smeContactedDate: undefined,
      smeRespondedDate: undefined,
      smeRecommendation: "",
      smeRecommendedSafetyStockQty: undefined,
      smeRecommendedUnrestrictedQty: undefined,
      smeAnalysis: "",
      smeAlternativeApplications: "",
      smeRiskAssessment: "",
      // Follow-up step
      scheduleFollowUp: false,
      scheduleFollowUpReason: "",
      scheduleFollowUpDate: undefined,
      scheduleReviewFrequencyWeeks: undefined,
      // Final decision step
      finalDecision: "",
      finalSafetyStockQty: undefined,
      finalUnrestrictedQty: undefined,
      finalNotes: "",
    },
  });

  // Track form dirty state for enabling/disabling save button
  // Must destructure formState to ensure proper reactivity
  const {
    formState: { isDirty },
  } = form;

  // Watch proposed qty fields to determine if SME review is required
  const proposedSafetyStockQty = form.watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = form.watch("proposedUnrestrictedQty");

  // Check if any qty change is proposed for either stock type
  // 0 means "no change" (keep current), non-zero means a change is proposed
  const hasProposedQty = (proposedSafetyStockQty !== undefined && proposedSafetyStockQty !== null && proposedSafetyStockQty !== 0) ||
                         (proposedUnrestrictedQty !== undefined && proposedUnrestrictedQty !== null && proposedUnrestrictedQty !== 0);

  // Compute dynamic review steps based on qty adjustment
  // SME Review is optional when no proposed qty is set for either stock type
  const reviewSteps = React.useMemo(
    () => getReviewSteps(hasProposedQty),
    [hasProposedQty]
  );

  // Determine if SME review is required (any qty change is proposed)
  const isSmeRequired = hasProposedQty;

  // Revalidate SME step when requirements change (optional -> required)
  React.useEffect(() => {
    // When SME becomes required, check if the current data passes the required schema
    if (isSmeRequired && isStepComplete(2)) {
      const formValues = form.getValues();
      const result = step3RequiredSchema.safeParse(formValues);
      if (!result.success) {
        // SME step no longer valid with required schema - unmark it
        markStepIncomplete(2);
      }
    }
  }, [isSmeRequired, isStepComplete, form, markStepIncomplete]);

  // Mutation for saving/updating review
  const saveReviewMutation = useMutation({
    mutationFn: async ({
      step,
      data,
    }: {
      step: number;
      data: Partial<MaterialReviewFormData>;
    }) => {
      if (!materialData?.material_number) {
        throw new Error("No material number provided");
      }

      // Extract only the fields relevant to this step
      const apiData = extractPayloadForStep(
        step,
        data as MaterialReviewFormData
      );

      if (reviewId) {
        // Update existing review with step-specific payload
        return apiClient.updateReview(
          materialData.material_number,
          reviewId,
          step,
          apiData as MaterialReviewUpdate
        );
      } else {
        // Create new review (only for step 0)
        const result = await apiClient.createReview(
          materialData.material_number,
          apiData as unknown as MaterialReviewCreate
        );
        // Store the review_id for subsequent updates
        if (result.review_id) {
          setReviewId(result.review_id);
        }
        return result;
      }
    },
    onSuccess: (savedReview) => {
      // Reset the form immediately with the saved data from the server
      // This eliminates race conditions and provides instant UI feedback
      if (savedReview) {
        const formData = mapReviewToFormData(savedReview, predefinedReasons);
        form.reset(formData, { keepErrors: false, keepDirty: false });

        // Set the ref to prevent the useEffect from resetting again
        // when the background refetch completes
        lastResetReviewIdRef.current = savedReview.review_id ?? null;
      }

      // Invalidate queries to refresh the cache for other components
      // The background refetch won't affect this form (ref blocks it)
      if (materialData?.material_number) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.materials.detail(materialData.material_number),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.materials.all,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save review. Please try again.");
    },
  });

  // Handle step navigation with validation and auto-save
  const handleNext = async (): Promise<boolean> => {
    // Safety check: Ensure prerequisites are met before saving
    if (!canSaveCurrentStep) {
      console.warn("Cannot save: previous steps must be completed first");
      return false;
    }

    // Get the appropriate schema for current step
    // Use step3RequiredSchema when SME is required (qty adjustment is non-zero)
    const stepSchemas = [
      step1Schema,
      step2Schema,
      isSmeRequired ? step3RequiredSchema : step3Schema,
      step4Schema,
      step5Schema,
    ];
    const currentSchema = stepSchemas[currentStep];
    const currentStepInfo = reviewSteps[currentStep];

    if (!currentSchema) {
      return false;
    }

    // Get current form values
    const formValues = form.getValues();

    // Validate current step
    const result = currentSchema.safeParse(formValues);

    if (!result.success) {
      // For optional steps, check if all errors are about empty required fields
      // If so, allow skipping the step
      if (currentStepInfo?.isOptional) {
        const hasNonEmptyData = result.error.issues.some((issue) => {
          const fieldValue = issue.path.reduce<unknown>((obj, key) => {
            if (typeof key === "string" || typeof key === "number") {
              return (obj as Record<string, unknown>)?.[key];
            }
            return obj;
          }, formValues);
          // If there's actual data entered (not empty/null/undefined), require validation
          return (
            fieldValue !== "" &&
            fieldValue !== null &&
            fieldValue !== undefined &&
            fieldValue !== false
          );
        });

        // If no data was entered in this optional step, allow skipping
        if (!hasNonEmptyData) {
          markStepComplete(currentStep);
          return true;
        }
      }

      // Show validation errors
      result.error.issues.forEach((issue) => {
        const path = issue.path.join(".") as keyof MaterialReviewFormData;
        form.setError(path, {
          type: "manual",
          message: issue.message,
        });
      });
      return false;
    }

    // Save progress to backend with step-specific payload
    try {
      await saveReviewMutation.mutateAsync({
        step: currentStep,
        data: formValues,
      });
      markStepComplete(currentStep);

      // If this is the last step, trigger the parent onSubmit callback
      if (currentStep === 4) {
        onSubmit();
        return true;
      }

      return true;
    } catch (error) {
      console.error("Error saving step:", error);
      return false;
    }
  };

  // Handle "Next" navigation with validation for optional steps
  const handleNextNavigation = () => {
    const currentStepInfo = reviewSteps[currentStep];

    // For optional steps, validate and mark complete if valid
    if (currentStepInfo?.isOptional) {
      const stepSchemas = [
        step1Schema,
        step2Schema,
        isSmeRequired ? step3RequiredSchema : step3Schema,
        step4Schema,
        step5Schema,
      ];
      const currentSchema = stepSchemas[currentStep];
      const formValues = form.getValues();
      const result = currentSchema.safeParse(formValues);

      if (result.success) {
        // Valid (either empty or complete) - mark complete and navigate
        markStepComplete(currentStep);
      } else {
        // Check if there's partial data that needs validation
        const hasNonEmptyData = result.error.issues.some((issue) => {
          const fieldValue = issue.path.reduce<unknown>((obj, key) => {
            if (typeof key === "string" || typeof key === "number") {
              return (obj as Record<string, unknown>)?.[key];
            }
            return obj;
          }, formValues);
          return (
            fieldValue !== "" &&
            fieldValue !== null &&
            fieldValue !== undefined &&
            fieldValue !== false
          );
        });

        if (!hasNonEmptyData) {
          // No data entered in optional step - mark complete and navigate
          markStepComplete(currentStep);
        }
        // If partial data exists, don't mark complete (user needs to fix or clear)
      }
    }

    // Navigate to next step
    nextStep();
  };

  // Pre-fill form with existing review data if editing
  React.useEffect(() => {
    if (existingReview && isEditMode) {
      // Only reset the form if this is a NEW review or we haven't reset for this review yet
      // This prevents the form from resetting on every refetch (which would overwrite user changes)
      const currentReviewId = existingReview.review_id ?? null;

      if (lastResetReviewIdRef.current === currentReviewId) {
        // We've already reset the form for this review - skip to avoid overwriting changes
        return;
      }

      // Mark that we're resetting for this review
      lastResetReviewIdRef.current = currentReviewId;

      // Use the helper function to map API data to form format
      const formData = mapReviewToFormData(existingReview, predefinedReasons);

      form.reset(formData);

      // Validate each step using Zod schemas and mark as complete if valid
      if (step1Schema.safeParse(formData).success) {
        markStepComplete(0);
      }

      if (step2Schema.safeParse(formData).success) {
        markStepComplete(1);
      }

      if (step3Schema.safeParse(formData).success) {
        markStepComplete(2);
      }

      if (step4Schema.safeParse(formData).success) {
        markStepComplete(3);
      }

      if (step5Schema.safeParse(formData).success) {
        markStepComplete(4);
      }
    }
  }, [materialData, existingReview, isEditMode, form, markStepComplete, predefinedReasons]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-300" />
        <h3 className="text-lg font-semibold whitespace-nowrap">
          Reviewing Material
        </h3>
        <div className="flex-1 border-t border-gray-300" />
      </div>

      <StepProgressIndicator />

      {!canSaveCurrentStep && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Complete previous steps to save this section
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                You can view this step, but you must complete and save all
                previous steps before you can save changes here.
              </p>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form className="space-y-6">
          {/* Step 1: General Information */}
          <StepContent step={0}>
            <Step1GeneralInfo />
          </StepContent>

          {/* Step 2: Checklist */}
          <StepContent step={1}>
            <Step2Checklist />
          </StepContent>

          {/* Step 3: SME Investigation */}
          <StepContent step={2}>
            <Step3SMEInvestigation />
          </StepContent>

          {/* Step 4: Follow-up Scheduling */}
          <StepContent step={3}>
            <Step4FollowUp />
          </StepContent>

          {/* Step 5: Final Decision */}
          <StepContent step={4}>
            <Step5FinalDecision />
          </StepContent>

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={saveReviewMutation.isPending}
            >
              Close
            </Button>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1"
                disabled={saveReviewMutation.isPending}
              >
                Previous
              </Button>
            )}
            {currentStep < totalSteps - 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleNextNavigation}
                className="flex-1"
                disabled={saveReviewMutation.isPending}
              >
                Next
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1"
              disabled={
                saveReviewMutation.isPending || !canSaveCurrentStep || !isDirty
              }
            >
              {saveReviewMutation.isPending
                ? "Saving..."
                : currentStep === totalSteps - 1
                ? "Complete Review"
                : "Save Step"}
            </Button>
            {/* Comments button - only show when editing */}
            {
            // isEditMode && reviewId && 
            (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCommentsDialogOpen(true)}
                className="flex items-center gap-2"
                disabled={saveReviewMutation.isPending}
              >
                Comments
                {commentCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {commentCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Comments dialog - only show when editing an existing review */}
      {isEditMode && reviewId && materialData?.material_number && (
        <ReviewCommentsDialog
          materialNumber={materialData.material_number}
          reviewId={reviewId}
          isOpen={commentsDialogOpen}
          onOpenChange={setCommentsDialogOpen}
          hideInput={false}
        />
      )}
    </div>
  );
}

// Main export wrapper with MultiStepFormProvider
export function MaterialReviewForm(props: MaterialReviewFormProps) {
  return (
    <MultiStepFormProvider steps={DEFAULT_REVIEW_STEPS}>
      <MaterialReviewFormInner {...props} />
    </MultiStepFormProvider>
  );
}
