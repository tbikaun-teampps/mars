import { useFormContext } from "react-hook-form";
import { Info } from "lucide-react";
import { useMemo } from "react";
import {
  FormGroupedSelectField,
  FormInputField,
  FormTextareaField,
  type GroupedSelectGroup,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stepheader } from "./step-header";
import { useProposedActionOptions } from "./use-proposed-action-options";
import { useLookupOptions } from "@/api/queries";

export function Step3SMEInvestigation() {
  const { watch } = useFormContext();
  const smeContactedDate = watch("smeContactedDate");
  const proposedSafetyStockQty = watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = watch("proposedUnrestrictedQty");
  const smeRecommendation = watch("smeRecommendation");
  const smeFeedbackMethod = watch("smeFeedbackMethod");
  const smeDepartment = watch("smeDepartment");

  // Fetch proposed action options for SME recommendation
  const { groups: proposedActionGroups, isLoading: actionsLoading } =
    useProposedActionOptions();

  // Fetch feedback method options
  const { data: feedbackMethodOptions, isLoading: feedbackLoading } =
    useLookupOptions("feedback_method");

  // Fetch SME department options
  const { data: smeDepartmentOptions, isLoading: departmentLoading } =
    useLookupOptions("sme_type");

  const feedbackMethodGroups = useMemo((): GroupedSelectGroup[] => {
    if (!feedbackMethodOptions?.groups) {
      return [
        {
          group_name: null,
          group_order: 0,
          options: [
            { label: "Email", value: "email", description: "Feedback via email" },
            { label: "Meeting", value: "meeting", description: "In-person or virtual meeting" },
            { label: "Phone Call", value: "phone_call", description: "Feedback via phone" },
            { label: "Other", value: "other", description: "Specify another method" },
          ],
        },
      ];
    }

    const groups: GroupedSelectGroup[] = feedbackMethodOptions.groups.map((group) => ({
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
          description: "Specify another method",
        });
      } else {
        groups.push({
          group_name: null,
          group_order: 999,
          options: [
            { label: "Other", value: "other", description: "Specify another method" },
          ],
        });
      }
    }

    return groups;
  }, [feedbackMethodOptions]);

  const smeDepartmentGroups = useMemo((): GroupedSelectGroup[] => {
    if (!smeDepartmentOptions?.groups) {
      return [
        {
          group_name: null,
          group_order: 0,
          options: [
            { label: "Maintenance", value: "maintenance", description: "Maintenance department" },
            { label: "Reliability", value: "reliability", description: "Reliability engineering" },
            { label: "Operations", value: "operations", description: "Operations team" },
            { label: "Engineering", value: "engineering", description: "Engineering department" },
            { label: "Other", value: "other", description: "Specify another department" },
          ],
        },
      ];
    }

    const groups: GroupedSelectGroup[] = smeDepartmentOptions.groups.map((group) => ({
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
          description: "Specify another department",
        });
      } else {
        groups.push({
          group_name: null,
          group_order: 999,
          options: [
            { label: "Other", value: "other", description: "Specify another department" },
          ],
        });
      }
    }

    return groups;
  }, [smeDepartmentOptions]);

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

      <div className="grid grid-cols-1 gap-4">
        <FormGroupedSelectField
          name="smeDepartment"
          label="Which department is the SME from? *"
          placeholder="Select department"
          groups={smeDepartmentGroups}
          disabled={departmentLoading}
        />
        <FormGroupedSelectField
          name="smeFeedbackMethod"
          label="How was feedback provided? *"
          placeholder="Select feedback method"
          groups={feedbackMethodGroups}
          disabled={feedbackLoading}
        />
      </div>

      {smeDepartment === "other" && (
        <FormInputField
          name="smeDepartmentOther"
          label="Please specify the department *"
          placeholder="Enter custom department"
        />
      )}

      {smeFeedbackMethod === "other" && (
        <FormInputField
          name="smeFeedbackMethodOther"
          label="Please specify the feedback method *"
          placeholder="Enter custom feedback method"
        />
      )}

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

      <FormGroupedSelectField
        name="smeRecommendation"
        label="What is the recommendation from the SME? *"
        placeholder="Select SME recommendation"
        groups={proposedActionGroups}
        disabled={actionsLoading}
      />

      {smeRecommendation === "other" && (
        <FormInputField
          name="smeRecommendationOther"
          label="Please specify the SME recommendation *"
          placeholder="Enter custom recommendation"
        />
      )}

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
