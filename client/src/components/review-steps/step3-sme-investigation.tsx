import { useFormContext } from "react-hook-form";
import { Info } from "lucide-react";
import {
  FormInputField,
  FormSelectField,
  FormTextareaField,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stepheader } from "./step-header";

export function Step3SMEInvestigation() {
  const { watch } = useFormContext();
  const smeContactedDate = watch("smeContactedDate");
  const proposedSafetyStockQty = watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = watch("proposedUnrestrictedQty");

  // SME review is optional when no quantity adjustment is proposed for either stock type
  // 0 means "no change" (keep current), non-zero means a change is proposed
  const hasProposedQty = (proposedSafetyStockQty !== undefined && proposedSafetyStockQty !== null && proposedSafetyStockQty !== 0) ||
                         (proposedUnrestrictedQty !== undefined && proposedUnrestrictedQty !== null && proposedUnrestrictedQty !== 0);
  const isOptional = !hasProposedQty;

  return (
    <div className="space-y-4">
      <Stepheader title="Subject Matter Expert (SME) Review" />

      {isOptional && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-blue-700">
            Since no quantity change is proposed, SME review is not required.
            You can skip this step by clicking "Next".
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="smeName"
          label="What is the name of the SME consulted? *"
          placeholder="SME name"
        />
        <FormInputField
          name="smeEmail"
          label="What is the email of the SME consulted? *"
          placeholder="SME email address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="smeDepartment"
          label="Which department is the SME from? *"
          placeholder="Enter department (e.g., Maintenance, Reliability, Operations)"
        />
        <FormSelectField
          name="smeFeedbackMethod"
          label="How was feedback provided? *"
          placeholder="Enter feedback method"
          options={[
            { label: "Email", value: "email" },
            { label: "Meeting", value: "meeting" },
            { label: "Phone Call", value: "phone_call" },
            { label: "Other", value: "other" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="smeContactedDate"
          label="When was the SME contacted? *"
          type="date"
        />
        <FormInputField
          name="smeRespondedDate"
          label="When did the SME respond? *"
          type="date"
          disabled={!smeContactedDate}
        />
      </div>

      <FormInputField
        name="smeRecommendation"
        label="What is the recommendation from the SME? *"
        placeholder="Enter recommendation (e.g., Scrap, Reduce, Keep, Alternative Use)"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="smeRecommendedSafetyStockQty"
          label="SME Recommended Safety Stock"
          type="number"
          placeholder="Enter recommended safety stock"
        />
        <FormInputField
          name="smeRecommendedUnrestrictedQty"
          label="SME Recommended Unrestricted"
          type="number"
          placeholder="Enter recommended unrestricted"
        />
      </div>

      <FormTextareaField
        name="smeAnalysis"
        label="What is the analysis or feedback from the SME? *"
        placeholder="Enter detailed analysis or feedback from the SME"
        rows={4}
      />

      <FormTextareaField
        name="smeAlternativeApplications"
        label="What are the alternative applications suggested by the SME? *"
        placeholder="Enter any alternative applications suggested by the SME. If this is not applicable, please state 'N/A'."
        rows={4}
      />

      <FormTextareaField
        name="smeRiskAssessment"
        label="What is the risk assessment from the SME? *"
        placeholder="Enter any risk assessment details suggested by the SME. If this is not applicable, please state 'N/A'."
        rows={4}
      />
    </div>
  );
}
