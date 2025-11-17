import { useFormContext } from "react-hook-form";
import { FormInputField, FormToggleGroupField } from "@/components/ui/form";
import { Stepheader } from "./step-header";

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

export function Step4FollowUp() {
  const { watch } = useFormContext();
  const scheduleFollowUp = watch("scheduleFollowUp");

  return (
    <div className="space-y-4">
      <Stepheader title="Follow-up Review Scheduling" />
      <p className="text-sm text-gray-600">
        Set up future review dates and follow-up actions.
      </p>
      <FormToggleGroupField
        name="scheduleFollowUp"
        label="Will this material require a follow-up review?"
      />

      <FormInputField
        name="scheduleFollowUpReason"
        label="What is the reason for the follow-up review? *"
        placeholder="Enter reason for follow-up review"
        disabled={!scheduleFollowUp}
      />

      <FormInputField
        name="scheduleFollowUpDate"
        label="When is the follow-up review scheduled? *"
        type="date"
        min={getTodayDate()}
        disabled={!scheduleFollowUp}
      />

      <FormInputField
        name="scheduleReviewFrequency"
        label="What is the review frequency (in months)? *"
        type="number"
        placeholder="Enter review frequency in months. If left blank, no automatic reviews will be scheduled."
        disabled={!scheduleFollowUp}
      />
    </div>
  );
}
