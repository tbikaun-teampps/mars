import { useFormContext } from "react-hook-form";
import {
  FormSelectField,
  FormInputField,
  FormTextareaField,
} from "@/components/ui/form";
import { Stepheader } from "./step-header";
import { useLookupOptions } from "@/api/queries";
import { useMemo } from "react";

export function Step1GeneralInfo() {
  const { watch } = useFormContext();
  const reviewReason = watch("reviewReason");

  // Fetch review reason options from the backend
  const { data: reviewReasonOptions, isLoading: optionsLoading } =
    useLookupOptions("review_reason");

  // Convert the grouped options to a flat list for the select component
  // Always include "Other" at the end
  const reviewReasonSelectOptions = useMemo(() => {
    if (!reviewReasonOptions?.options) {
      // Fallback to hardcoded options if not loaded yet
      return [
        { label: "Annual Review", value: "annual_review" },
        { label: "Usage Spike", value: "usage_spike" },
        { label: "Supplier Change", value: "supplier_change" },
        { label: "Other", value: "other" },
      ];
    }

    // Map the API response to select options format
    const options = reviewReasonOptions.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    // Always add "Other" option at the end if not present
    if (!options.some((opt) => opt.value === "other")) {
      options.push({ label: "Other", value: "other" });
    }

    return options;
  }, [reviewReasonOptions]);

  return (
    <div className="space-y-4">
      <Stepheader title="General Information" />

      <FormSelectField
        name="reviewReason"
        label="What is the reason for this review? *"
        placeholder="Select a reason for this review"
        options={reviewReasonSelectOptions}
        disabled={optionsLoading}
      />

      {reviewReason === "other" && (
        <FormInputField
          name="reviewReasonOther"
          label="Please specify the reason for this review *"
          placeholder="Enter custom review reason"
        />
      )}

      <FormInputField
        name="monthsNoMovement"
        label="How many months have there been no movements? *"
        placeholder="Enter number of months with no movement"
        type="number"
        min="0"
      />

      <FormInputField
        name="proposedAction"
        label="What is the proposed action? *"
        placeholder="Enter proposed action (e.g., Scrap, Reduce, Keep, Alternative Use)"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="proposedSafetyStockQty"
          label="Target Safety Stock Quantity"
          placeholder="Enter target safety stock"
          type="number"
        />
        <FormInputField
          name="proposedUnrestrictedQty"
          label="Target Unrestricted Quantity"
          placeholder="Enter target unrestricted"
          type="number"
        />
      </div>

      <FormTextareaField
        name="businessJustification"
        label="What is the business justification for the proposed action? *"
        placeholder="Enter business justification for the proposed action"
        rows={4}
      />
    </div>
  );
}
