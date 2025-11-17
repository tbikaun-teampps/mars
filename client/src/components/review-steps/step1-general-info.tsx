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

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="currentStockQty"
          label="What is the current stock quantity? *"
          placeholder="Enter current stock quantity"
          type="number"
        />
        <FormInputField
          name="currentStockValue"
          label="What is the current stock value? *"
          placeholder="Enter current stock value"
          type="number"
        />
      </div>

      <FormInputField
        name="monthsNoMovement"
        label="How many months have there been no movements? *"
        placeholder="Enter number of months with no movement"
        type="number"
        min="0"
      />

      <div className="grid grid-cols-1 gap-4">
        <FormInputField
          name="proposedAction"
          label="What is the proposed action? *"
          placeholder="Enter proposed action (e.g., Scrap, Reduce, Keep, Alternative Use)"
        />
        <FormInputField
          name="proposedQtyAdjustment"
          label="What is the proposed quantity adjustment? *"
          placeholder="Enter proposed quantity adjustment"
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
