import { FormInputField, FormTextareaField } from "@/components/ui/form";
import { Stepheader } from "./step-header";

export function Step5FinalDecision() {
  return (
    <div className="space-y-4">
      <Stepheader title="Final Decision" />
      <p className="text-sm text-gray-600">
        Document the final decision and actions to be taken for this material.
      </p>

      <div className="grid grid-cols-1 gap-4">
        <FormInputField
          name="finalDecision"
          label="What is the final decision? *"
          placeholder="Enter final decision (e.g., Scrap, Reduce, Keep, Alternative Use)"
        />
        <FormInputField
          name="finalQtyAdjustment"
          label="What is the final quantity adjustment? *"
          type="number"
          placeholder="Enter final quantity adjustment"
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
