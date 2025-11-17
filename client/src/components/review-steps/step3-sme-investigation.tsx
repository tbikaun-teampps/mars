import { useFormContext } from "react-hook-form";
import {
  FormInputField,
  FormSelectField,
  FormTextareaField,
} from "@/components/ui/form";
import { Stepheader } from "./step-header";

export function Step3SMEInvestigation() {
  const { watch } = useFormContext();
  const smeContactedDate = watch("smeContactedDate");

  return (
    <div className="space-y-4">
      <Stepheader title="Subject Matter Expert (SME) Review" />
      {/* <p className="text-sm text-gray-600">
        Document consultation with technical experts regarding this material.
      </p> */}

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

      <div className="grid grid-cols-1 gap-4">
        <FormInputField
          name="smeRecommendation"
          label="What is the recommendation from the SME? *"
          placeholder="Enter recommendation (e.g., Scrap, Reduce, Keep, Alternative Use)"
        />
        <FormInputField
          name="smeRecommendedQty"
          label="What is the recommended quantity from the SME? *"
          type="number"
          placeholder="Enter recommended quantity"
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
