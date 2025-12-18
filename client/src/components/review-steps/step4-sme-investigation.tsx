import { useFormContext } from "react-hook-form";
import { Info, Lock } from "lucide-react";
import { useMemo } from "react";
import {
  FormGroupedSelectField,
  FormInputField,
  FormTextareaField,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stepheader } from "./step-header";
import { useProposedActionOptions } from "./use-proposed-action-options";
import { useReviewAssignments, useCurrentUser } from "@/api/queries";

interface Step4SMEInvestigationProps {
  materialNumber?: number;
  reviewId?: number | null;
  isStatusLocked?: boolean;
}

export function Step4SMEInvestigation({
  materialNumber,
  reviewId,
  isStatusLocked = false,
}: Step4SMEInvestigationProps) {
  const { watch } = useFormContext();
  const proposedSafetyStockQty = watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = watch("proposedUnrestrictedQty");
  const smeRecommendation = watch("smeRecommendation");

  // Fetch current user and assignments for view-only mode
  const { data: currentUser } = useCurrentUser();
  const { data: assignments } = useReviewAssignments(materialNumber, reviewId);

  // Determine if user can edit this step (must be assigned as SME or be admin)
  const viewOnlyInfo = useMemo(() => {
    if (!currentUser || !assignments) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Admins can always edit
    if (currentUser.is_admin) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Find SME assignment
    const smeAssignment = assignments.find((a) => a.assignment_type === "sme");

    // If no assignment exists yet, allow editing (assignment step not completed)
    if (!smeAssignment) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Check if current user is the assigned SME
    const isAssignedSme = smeAssignment.user_id === currentUser.id;

    return {
      isViewOnly: !isAssignedSme,
      assigneeName: smeAssignment.user_name || "another user",
    };
  }, [currentUser, assignments]);

  // Combine role-based view-only mode with status-based locking
  const isDisabled = viewOnlyInfo.isViewOnly || isStatusLocked;

  // Fetch proposed action options for SME recommendation
  const { groups: proposedActionGroups, isLoading: actionsLoading } =
    useProposedActionOptions();

  // SME review is optional when no quantity adjustment is proposed for either stock type
  // 0 means "no change" (keep current), non-zero means a change is proposed
  const hasProposedQty =
    (proposedSafetyStockQty !== undefined &&
      proposedSafetyStockQty !== null &&
      proposedSafetyStockQty !== 0) ||
    (proposedUnrestrictedQty !== undefined &&
      proposedUnrestrictedQty !== null &&
      proposedUnrestrictedQty !== 0);
  const isOptional = !hasProposedQty;

  return (
    <div className="space-y-4">
      <Stepheader title="Subject Matter Expert (SME) Review" />

      {viewOnlyInfo.isViewOnly && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-amber-700">
            This step is assigned to{" "}
            <strong>{viewOnlyInfo.assigneeName}</strong>. You can view the
            information but cannot make changes.
          </AlertDescription>
        </Alert>
      )}

      {isOptional && !viewOnlyInfo.isViewOnly && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-blue-700">
            Since no quantity change is proposed, SME review is not required.
            You can skip this step by clicking "Next".
          </AlertDescription>
        </Alert>
      )}

      <FormGroupedSelectField
        name="smeRecommendation"
        label="Recommendation"
        placeholder="Select recommendation"
        groups={proposedActionGroups}
        disabled={actionsLoading || isDisabled}
        required
      />

      {smeRecommendation === "other" && (
        <FormInputField
          name="smeRecommendationOther"
          label="Please specify the recommendation"
          placeholder="Enter custom recommendation"
          disabled={isDisabled}
          required
        />
      )}

      <FormInputField
        name="smeRecommendedSafetyStockQty"
        label="Recommended Target Safety Stock Quantity"
        type="number"
        placeholder="Enter recommended safety stock"
        disabled={isDisabled}
      />
      <FormInputField
        name="smeRecommendedUnrestrictedQty"
        label="Recommended Target Unrestricted Quantity"
        type="number"
        placeholder="Enter recommended unrestricted"
        disabled={isDisabled}
      />

      <FormTextareaField
        name="smeAnalysis"
        label="Analysis"
        placeholder="Provide detailed analysis or feedback"
        rows={4}
        disabled={isDisabled}
        required
      />

      <FormTextareaField
        name="smeAlternativeApplications"
        label="Alternative Applications"
        placeholder="List any alternative applications for this material. If not applicable, state 'N/A'."
        rows={4}
        disabled={isDisabled}
        required
      />

      <FormTextareaField
        name="smeRiskAssessment"
        label="Risk Assessment"
        placeholder="Describe any risks associated with the recommendation. If not applicable, state 'N/A'."
        rows={4}
        disabled={isDisabled}
        required
      />
    </div>
  );
}
