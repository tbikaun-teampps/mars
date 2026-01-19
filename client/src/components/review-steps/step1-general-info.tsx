import { useFormContext } from "react-hook-form";
import {
  FormGroupedSelectField,
  FormInputField,
  FormTextareaField,
  type GroupedSelectGroup,
} from "@/components/ui/form";
import { Stepheader } from "./step-header";
import { useLookupOptions } from "@/api/queries";
import { useMemo } from "react";
import { useProposedActionOptions } from "./use-proposed-action-options";
import { cn } from "@/lib/utils";

interface Step1GeneralInfoProps {
  isStatusLocked?: boolean;
}

export function Step1GeneralInfo({
  isStatusLocked = false,
}: Step1GeneralInfoProps) {
  const { watch } = useFormContext();
  const reviewReason = watch("reviewReason");
  const proposedAction = watch("proposedAction");

  // Fetch review reason options from the backend
  const { data: reviewReasonOptions, isLoading: optionsLoading } =
    useLookupOptions("review_reason");

  // Fetch proposed action options
  const { groups: proposedActionGroups, isLoading: actionsLoading } =
    useProposedActionOptions();

  // Convert the API response to grouped select format
  const reviewReasonGroups = useMemo((): GroupedSelectGroup[] => {
    if (!reviewReasonOptions?.groups) {
      // Fallback to hardcoded options if not loaded yet
      return [
        {
          group_name: null,
          group_order: 0,
          options: [
            {
              label: "Annual Review",
              value: "annual_review",
              description: "Scheduled yearly review",
            },
            {
              label: "Usage Spike",
              value: "usage_spike",
              description: "Unexpected increase in consumption",
            },
            {
              label: "Supplier Change",
              value: "supplier_change",
              description: "Vendor or supply chain change",
            },
            {
              label: "Other",
              value: "other",
              description: "Specify a custom reason",
            },
          ],
        },
      ];
    }

    // Map the API response to grouped select format
    const groups: GroupedSelectGroup[] = reviewReasonOptions.groups.map(
      (group) => ({
        group_name: group.group_name ?? null,
        group_order: group.group_order,
        options: group.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          description: opt.description ?? null,
        })),
      })
    );

    // Ensure "Other" option exists (add to last group or create new ungrouped)
    const hasOther = groups.some((g) =>
      g.options.some((opt) => opt.value === "other")
    );

    if (!hasOther) {
      // Find or create an ungrouped section
      const ungrouped = groups.find((g) => g.group_name === null);
      if (ungrouped) {
        ungrouped.options.push({
          label: "Other",
          value: "other",
          description: "Specify a custom reason",
        });
      } else {
        groups.push({
          group_name: null,
          group_order: 999,
          options: [
            {
              label: "Other",
              value: "other",
              description: "Specify a custom reason",
            },
          ],
        });
      }
    }

    return groups;
  }, [reviewReasonOptions]);

  return (
    <div className="space-y-4">
      <Stepheader title="General Information" />

      <div
        className={cn(
          "grid gap-4",
          reviewReason === "other" ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        <FormGroupedSelectField
          name="reviewReason"
          label="What is the reason for this review?"
          placeholder="Select a reason for this review"
          groups={reviewReasonGroups}
          disabled={optionsLoading || isStatusLocked}
          required
        />

        {reviewReason === "other" && (
          <FormInputField
            name="reviewReasonOther"
            label="Please specify the reason for this review"
            placeholder="Enter custom review reason"
            disabled={isStatusLocked}
            required
          />
        )}
        <FormGroupedSelectField
          name="proposedAction"
          label="What is the proposed action?"
          placeholder="Select a proposed action"
          groups={proposedActionGroups}
          disabled={actionsLoading || isStatusLocked}
          required
        />
        {proposedAction === "other" && (
          <FormInputField
            name="proposedActionOther"
            label="Please specify the proposed action"
            placeholder="Enter custom proposed action"
            disabled={isStatusLocked}
            required
          />
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FormInputField
          name="monthsNoMovement"
          label="How many months have there been no movements?"
          placeholder="Enter number of months with no movement"
          type="number"
          min="0"
          disabled={isStatusLocked}
          required
        />

        <FormInputField
          name="proposedSafetyStockQty"
          label="Target Safety Stock Quantity"
          placeholder="Enter target safety stock"
          type="number"
          disabled={isStatusLocked}
        />
        <FormInputField
          name="proposedUnrestrictedQty"
          label="Target Unrestricted Quantity"
          placeholder="Enter target unrestricted"
          type="number"
          disabled={isStatusLocked}
        />
      </div>

      <FormTextareaField
        name="businessJustification"
        label="What is the business justification for the proposed action?"
        placeholder="Enter business justification for the proposed action"
        rows={1}
        disabled={isStatusLocked}
        required
      />
    </div>
  );
}
