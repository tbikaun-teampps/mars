import { useFormContext } from "react-hook-form";
import {
  FormSelectField,
  FormInputField,
  FormTextareaField,
} from "@/components/ui/form";
import { Stepheader } from "./step-header";

export function Step1GeneralInfo() {
  const { watch } = useFormContext();
  const reviewReason = watch("reviewReason");

  return (
    <div className="space-y-4">
      <Stepheader title="General Information" />

      <FormSelectField
        name="reviewReason"
        label="What is the reason for this review? *"
        placeholder="Select a reason for this review"
        options={[
          { label: "Annual Review", value: "annual_review" },
          { label: "Usage Spike", value: "usage_spike" },
          { label: "Supplier Change", value: "supplier_change" },
          { label: "Other", value: "other" },
        ]}
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
