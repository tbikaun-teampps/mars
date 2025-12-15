import { useFormContext } from "react-hook-form";
import { useMemo } from "react";
import {
  FormGroupedSelectField,
  FormInputField,
  FormToggleGroupField,
  type GroupedSelectGroup,
} from "@/components/ui/form";
import { Stepheader } from "./step-header";
import { useLookupOptions } from "@/api/queries";

export function Step4FollowUp() {
  const { watch } = useFormContext();
  const scheduleFollowUp = watch("scheduleFollowUp");
  const scheduleFollowUpReason = watch("scheduleFollowUpReason");

  // Fetch follow-up trigger options
  const { data: followUpTriggerOptions, isLoading: triggerLoading } =
    useLookupOptions("follow_up_trigger");

  const followUpTriggerGroups = useMemo((): GroupedSelectGroup[] => {
    if (!followUpTriggerOptions?.groups) {
      return [
        {
          group_name: null,
          group_order: 0,
          options: [
            { label: "Usage Review", value: "usage_review", description: "Review based on usage patterns" },
            { label: "Stock Level Check", value: "stock_level_check", description: "Verify stock levels" },
            { label: "Supplier Follow-up", value: "supplier_follow_up", description: "Follow up with supplier" },
            { label: "Price Review", value: "price_review", description: "Review pricing" },
            { label: "Other", value: "other", description: "Specify another reason" },
          ],
        },
      ];
    }

    const groups: GroupedSelectGroup[] = followUpTriggerOptions.groups.map((group) => ({
      group_name: group.group_name ?? null,
      group_order: group.group_order,
      options: group.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        description: opt.description ?? null,
      })),
    }));

    // Ensure "Other" option exists
    const hasOther = groups.some((g) =>
      g.options.some((opt) => opt.value === "other")
    );

    if (!hasOther) {
      const ungrouped = groups.find((g) => g.group_name === null);
      if (ungrouped) {
        ungrouped.options.push({
          label: "Other",
          value: "other",
          description: "Specify another reason",
        });
      } else {
        groups.push({
          group_name: null,
          group_order: 999,
          options: [
            { label: "Other", value: "other", description: "Specify another reason" },
          ],
        });
      }
    }

    return groups;
  }, [followUpTriggerOptions]);

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

      <FormGroupedSelectField
        name="scheduleFollowUpReason"
        label="What is the reason for the follow-up review? *"
        placeholder="Select reason for follow-up"
        groups={followUpTriggerGroups}
        disabled={!scheduleFollowUp || triggerLoading}
      />

      {scheduleFollowUpReason === "other" && (
        <FormInputField
          name="scheduleFollowUpReasonOther"
          label="Please specify the follow-up reason *"
          placeholder="Enter custom follow-up reason"
          disabled={!scheduleFollowUp}
        />
      )}

      <FormInputField
        name="scheduleFollowUpDate"
        label="When is the follow-up review scheduled? *"
        type="date"
        disabled={!scheduleFollowUp}
      />

      <FormInputField
        name="scheduleReviewFrequencyWeeks"
        label="What is the review frequency (in weeks)? *"
        type="number"
        placeholder="Enter review frequency in weeks. If left blank, no automatic reviews will be scheduled."
        disabled={!scheduleFollowUp}
      />
    </div>
  );
}
