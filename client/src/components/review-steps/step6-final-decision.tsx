import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Info, Lock } from "lucide-react";
import {
  FormGroupedSelectField,
  FormInputField,
  FormTextareaField,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stepheader } from "./step-header";
import { useProposedActionOptions } from "./use-proposed-action-options";
import { useReviewAssignments, useCurrentUser } from "@/api/queries";

interface Step6FinalDecisionProps {
  materialNumber?: number;
  reviewId?: number | null;
  isStatusLocked?: boolean;
}

export function Step6FinalDecision({
  materialNumber,
  reviewId,
  isStatusLocked = false,
}: Step6FinalDecisionProps) {
  const { watch, setValue } = useFormContext();
  const proposedSafetyStockQty = watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = watch("proposedUnrestrictedQty");
  const smeRecommendedSafetyStockQty = watch("smeRecommendedSafetyStockQty");
  const smeRecommendedUnrestrictedQty = watch("smeRecommendedUnrestrictedQty");
  const finalSafetyStockQty = watch("finalSafetyStockQty");
  const finalUnrestrictedQty = watch("finalUnrestrictedQty");
  const finalDecision = watch("finalDecision");

  // Fetch current user and assignments for view-only mode
  const { data: currentUser } = useCurrentUser();
  const { data: assignments } = useReviewAssignments(materialNumber, reviewId);

  // Determine if user can edit this step (must be assigned as approver or be admin)
  const viewOnlyInfo = React.useMemo(() => {
    if (!currentUser || !assignments) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Admins can always edit
    if (currentUser.is_admin) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Find approver assignment
    const approverAssignment = assignments.find((a) => a.assignment_type === "approver");

    // If no assignment exists yet, allow editing (assignment step not completed)
    if (!approverAssignment) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Check if current user is the assigned approver
    const isAssignedApprover = approverAssignment.user_id === currentUser.id;

    return {
      isViewOnly: !isAssignedApprover,
      assigneeName: approverAssignment.user_name || "another user",
    };
  }, [currentUser, assignments]);

  // Combine role-based view-only mode with status-based locking
  const isViewOnly = viewOnlyInfo.isViewOnly || isStatusLocked;

  // Fetch proposed action options for final decision
  const { groups: proposedActionGroups, isLoading: actionsLoading } =
    useProposedActionOptions();

  // Check if any qty adjustment was proposed
  // 0 means "no change" (keep current), non-zero means a change is proposed
  const hasProposedQty = (proposedSafetyStockQty !== undefined && proposedSafetyStockQty !== null && proposedSafetyStockQty !== 0) ||
                         (proposedUnrestrictedQty !== undefined && proposedUnrestrictedQty !== null && proposedUnrestrictedQty !== 0);
  const isQtyAdjustmentLocked = !hasProposedQty;

  // Auto-clear final qty fields when locked
  React.useEffect(() => {
    if (isQtyAdjustmentLocked) {
      setValue("finalSafetyStockQty", null);
      setValue("finalUnrestrictedQty", null);
    }
  }, [isQtyAdjustmentLocked, setValue]);

  // Pre-fill final safety stock qty with SME's recommended qty if final is empty
  React.useEffect(() => {
    if (
      !isQtyAdjustmentLocked &&
      smeRecommendedSafetyStockQty !== undefined &&
      smeRecommendedSafetyStockQty !== null &&
      (finalSafetyStockQty === undefined || finalSafetyStockQty === null)
    ) {
      setValue("finalSafetyStockQty", smeRecommendedSafetyStockQty);
    }
  }, [smeRecommendedSafetyStockQty, finalSafetyStockQty, isQtyAdjustmentLocked, setValue]);

  // Pre-fill final unrestricted qty with SME's recommended qty if final is empty
  React.useEffect(() => {
    if (
      !isQtyAdjustmentLocked &&
      smeRecommendedUnrestrictedQty !== undefined &&
      smeRecommendedUnrestrictedQty !== null &&
      (finalUnrestrictedQty === undefined || finalUnrestrictedQty === null)
    ) {
      setValue("finalUnrestrictedQty", smeRecommendedUnrestrictedQty);
    }
  }, [smeRecommendedUnrestrictedQty, finalUnrestrictedQty, isQtyAdjustmentLocked, setValue]);

  return (
    <div className="space-y-4">
      <Stepheader title="Final Decision" />
      <p className="text-sm text-gray-600">
        Document the final decision and actions to be taken for this material.
      </p>

      {viewOnlyInfo.isViewOnly && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-amber-700">
            This step is assigned to <strong>{viewOnlyInfo.assigneeName}</strong>.
            You can view the information but cannot make changes.
          </AlertDescription>
        </Alert>
      )}

      <FormGroupedSelectField
        name="finalDecision"
        label="What is the final decision?"
        placeholder="Select final decision"
        groups={proposedActionGroups}
        disabled={actionsLoading || isViewOnly}
        required
      />

      {finalDecision === "other" && (
        <FormInputField
          name="finalDecisionOther"
          label="Please specify the final decision"
          placeholder="Enter custom final decision"
          disabled={isViewOnly}
          required
        />
      )}

      {isQtyAdjustmentLocked && !isViewOnly && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-blue-700">
            Final quantities are disabled because no quantity changes were proposed.
            To change quantities, go back to Step 1 and enter target quantities.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="finalSafetyStockQty"
          label="Final Safety Stock Quantity"
          type="number"
          placeholder="Enter final safety stock"
          disabled={isQtyAdjustmentLocked || isViewOnly}
        />
        <FormInputField
          name="finalUnrestrictedQty"
          label="Final Unrestricted Quantity"
          type="number"
          placeholder="Enter final unrestricted"
          disabled={isQtyAdjustmentLocked || isViewOnly}
        />
      </div>

      <FormTextareaField
        name="finalNotes"
        label="If there are any notes regarding the final decision, please provide them here."
        placeholder="Enter any notes regarding the final decision"
        rows={4}
        disabled={isViewOnly}
      />
    </div>
  );
}
