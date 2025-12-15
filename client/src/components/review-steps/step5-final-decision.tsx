import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Info } from "lucide-react";
import {
  FormGroupedSelectField,
  FormInputField,
  FormTextareaField,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stepheader } from "./step-header";
import { useProposedActionOptions } from "./use-proposed-action-options";

export function Step5FinalDecision() {
  const { watch, setValue } = useFormContext();
  const proposedSafetyStockQty = watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = watch("proposedUnrestrictedQty");
  const smeRecommendedSafetyStockQty = watch("smeRecommendedSafetyStockQty");
  const smeRecommendedUnrestrictedQty = watch("smeRecommendedUnrestrictedQty");
  const finalSafetyStockQty = watch("finalSafetyStockQty");
  const finalUnrestrictedQty = watch("finalUnrestrictedQty");
  const finalDecision = watch("finalDecision");

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

      <FormGroupedSelectField
        name="finalDecision"
        label="What is the final decision? *"
        placeholder="Select final decision"
        groups={proposedActionGroups}
        disabled={actionsLoading}
      />

      {finalDecision === "other" && (
        <FormInputField
          name="finalDecisionOther"
          label="Please specify the final decision *"
          placeholder="Enter custom final decision"
        />
      )}

      {isQtyAdjustmentLocked && (
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
          disabled={isQtyAdjustmentLocked}
        />
        <FormInputField
          name="finalUnrestrictedQty"
          label="Final Unrestricted Quantity"
          type="number"
          placeholder="Enter final unrestricted"
          disabled={isQtyAdjustmentLocked}
        />
      </div>

      <FormTextareaField
        name="finalNotes"
        label="If there are any notes regarding the final decision, please provide them here."
        placeholder="Enter any notes regarding the final decision"
        rows={4}
      />
    </div>
  );
}
