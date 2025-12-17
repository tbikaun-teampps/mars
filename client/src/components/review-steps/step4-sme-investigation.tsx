import { useFormContext } from "react-hook-form";
import { Info, Lock } from "lucide-react";
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
import { useLookupOptions, useReviewAssignments, useCurrentUser } from "@/api/queries";

interface Step4SMEInvestigationProps {
  materialNumber?: number;
  reviewId?: number | null;
}

export function Step4SMEInvestigation({
  materialNumber,
  reviewId,
}: Step4SMEInvestigationProps) {
  const { watch } = useFormContext();
  const smeContactedDate = watch("smeContactedDate");
  const proposedSafetyStockQty = watch("proposedSafetyStockQty");
  const proposedUnrestrictedQty = watch("proposedUnrestrictedQty");
  const smeRecommendation = watch("smeRecommendation");
  const smeFeedbackMethod = watch("smeFeedbackMethod");
  const smeDepartment = watch("smeDepartment");

  // Fetch current user and assignments for view-only mode
  const { data: currentUser } = useCurrentUser();
  const { data: assignments } = useReviewAssignments(materialNumber, reviewId);

  // Determine if user can edit this step (must be assigned as SME or be admin)
  const viewOnlyInfo = useMemo(() => {
    if (!currentUser || !assignments) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Admins can always edit
    if (currentUser.is_admin) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Find SME assignment
    const smeAssignment = assignments.find((a) => a.assignment_type === "sme");

    // If no assignment exists yet, allow editing (assignment step not completed)
    if (!smeAssignment) {
      return { isViewOnly: false, assigneeName: null };
    }

    // Check if current user is the assigned SME
    const isAssignedSme = smeAssignment.user_id === currentUser.id;

    return {
      isViewOnly: !isAssignedSme,
      assigneeName: smeAssignment.user_name || "another user",
    };
  }, [currentUser, assignments]);

  const isDisabled = viewOnlyInfo.isViewOnly;

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

      {viewOnlyInfo.isViewOnly && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-amber-700">
            This step is assigned to <strong>{viewOnlyInfo.assigneeName}</strong>.
            You can view the information but cannot make changes.
          </AlertDescription>
        </Alert>
      )}

      {isOptional && !viewOnlyInfo.isViewOnly && (
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
          disabled={isDisabled}
        />
        <FormInputField
          name="smeEmail"
          label="What is the email of the SME consulted? *"
          placeholder="SME email address"
          disabled={isDisabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <FormGroupedSelectField
          name="smeDepartment"
          label="Which department is the SME from? *"
          placeholder="Select department"
          groups={smeDepartmentGroups}
          disabled={departmentLoading || isDisabled}
        />
        <FormGroupedSelectField
          name="smeFeedbackMethod"
          label="How was feedback provided? *"
          placeholder="Select feedback method"
          groups={feedbackMethodGroups}
          disabled={feedbackLoading || isDisabled}
        />
      </div>

      {smeDepartment === "other" && (
        <FormInputField
          name="smeDepartmentOther"
          label="Please specify the department *"
          placeholder="Enter custom department"
          disabled={isDisabled}
        />
      )}

      {smeFeedbackMethod === "other" && (
        <FormInputField
          name="smeFeedbackMethodOther"
          label="Please specify the feedback method *"
          placeholder="Enter custom feedback method"
          disabled={isDisabled}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="smeContactedDate"
          label="When was the SME contacted? *"
          type="date"
          disabled={isDisabled}
        />
        <FormInputField
          name="smeRespondedDate"
          label="When did the SME respond? *"
          type="date"
          disabled={!smeContactedDate || isDisabled}
        />
      </div>

      <FormGroupedSelectField
        name="smeRecommendation"
        label="What is the recommendation from the SME? *"
        placeholder="Select SME recommendation"
        groups={proposedActionGroups}
        disabled={actionsLoading || isDisabled}
      />

      {smeRecommendation === "other" && (
        <FormInputField
          name="smeRecommendationOther"
          label="Please specify the SME recommendation *"
          placeholder="Enter custom recommendation"
          disabled={isDisabled}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormInputField
          name="smeRecommendedSafetyStockQty"
          label="SME Recommended Safety Stock"
          type="number"
          placeholder="Enter recommended safety stock"
          disabled={isDisabled}
        />
        <FormInputField
          name="smeRecommendedUnrestrictedQty"
          label="SME Recommended Unrestricted"
          type="number"
          placeholder="Enter recommended unrestricted"
          disabled={isDisabled}
        />
      </div>

      <FormTextareaField
        name="smeAnalysis"
        label="What is the analysis or feedback from the SME? *"
        placeholder="Enter detailed analysis or feedback from the SME"
        rows={4}
        disabled={isDisabled}
      />

      <FormTextareaField
        name="smeAlternativeApplications"
        label="What are the alternative applications suggested by the SME? *"
        placeholder="Enter any alternative applications suggested by the SME. If this is not applicable, please state 'N/A'."
        rows={4}
        disabled={isDisabled}
      />

      <FormTextareaField
        name="smeRiskAssessment"
        label="What is the risk assessment from the SME? *"
        placeholder="Enter any risk assessment details suggested by the SME. If this is not applicable, please state 'N/A'."
        rows={4}
        disabled={isDisabled}
      />
    </div>
  );
}
