import { z } from "zod";

// General information step
export const step1Schema = z
  .object({
    reviewReason: z.string().min(1, "Review reason is required"),
    reviewReasonOther: z.string().optional(),
    currentStockQty: z.number().optional().nullable(),
    currentStockValue: z.number().optional().nullable(),
    monthsNoMovement: z
      .number({
        message: "Months with no movement is required",
      })
      .min(0, "Months with no movement cannot be negative"),
    proposedAction: z.string().min(1, "Proposed action is required"),
    proposedActionOther: z.string().optional(),
    proposedSafetyStockQty: z.number().optional().nullable(),
    proposedUnrestrictedQty: z.number().optional().nullable(),
    businessJustification: z
      .string()
      .min(1, "Business justification is required"),
  })
  .refine(
    (data) => {
      // If "other" is selected, reviewReasonOther must be provided
      if (data.reviewReason === "other") {
        return (
          !!data.reviewReasonOther && data.reviewReasonOther.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "Please specify the custom review reason",
      path: ["reviewReasonOther"],
    }
  )
  .refine(
    (data) => {
      // If "other" is selected, proposedActionOther must be provided
      if (data.proposedAction === "other") {
        return (
          !!data.proposedActionOther && data.proposedActionOther.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "Please specify the custom proposed action",
      path: ["proposedActionOther"],
    }
  );

// Checklist step
export const step2Schema = z.object({
  // Boolean checklist items
  hasOpenOrders: z.boolean({
    message: "Please confirm if there are open orders",
  }),
  hasForecastDemand: z.boolean({
    message: "Please confirm if there is forecast demand",
  }),
  checkedAlternativePlants: z.boolean({
    message: "Please confirm if alternative plants were checked",
  }),
  contactedProcurement: z.boolean({
    message: "Please confirm if procurement was contacted",
  }),
  reviewedBomUsage: z.boolean({
    message: "Please confirm if BOM usage was reviewed",
  }),
  checkedSupersession: z.boolean({
    message: "Please confirm if supersession was checked",
  }),
  checkedHistoricalUsage: z.boolean({
    message: "Please confirm if historical usage was checked",
  }),

  // Additional details based on checklist
  openOrderNumbers: z.string().optional(),
  forecastNext12m: z.number().optional(),
  alternatePlantQty: z.number().optional(),
  procurementFeedback: z.string().optional(),
});

// SME Review step (optional when no qty adjustment, required otherwise)
export const step3Schema = z
  .object({
    smeName: z.string().optional(),
    smeEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
    smeDepartment: z.string().optional(),
    smeDepartmentOther: z.string().optional(),
    smeFeedbackMethod: z.string().optional(),
    smeFeedbackMethodOther: z.string().optional(),
    smeContactedDate: z.date().optional(),
    smeRespondedDate: z.date().optional(),
    smeRecommendation: z.string().optional(),
    smeRecommendationOther: z.string().optional(),
    smeRecommendedSafetyStockQty: z.number().optional().nullable(),
    smeRecommendedUnrestrictedQty: z.number().optional().nullable(),
    smeAnalysis: z.string().optional(),
    smeAlternativeApplications: z.string().optional(),
    smeRiskAssessment: z.string().optional(),
  })
  .refine(
    (data) => {
      // If both dates are provided, ensure contacted date is before or on the responded date
      if (data.smeContactedDate && data.smeRespondedDate) {
        return data.smeContactedDate <= data.smeRespondedDate;
      }
      return true;
    },
    {
      message: "Contacted date must be before or on the responded date",
      path: ["smeRespondedDate"],
    }
  )
  .refine(
    (data) => {
      if (data.smeDepartment === "other") {
        return !!data.smeDepartmentOther && data.smeDepartmentOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom department",
      path: ["smeDepartmentOther"],
    }
  )
  .refine(
    (data) => {
      if (data.smeFeedbackMethod === "other") {
        return !!data.smeFeedbackMethodOther && data.smeFeedbackMethodOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom feedback method",
      path: ["smeFeedbackMethodOther"],
    }
  )
  .refine(
    (data) => {
      if (data.smeRecommendation === "other") {
        return !!data.smeRecommendationOther && data.smeRecommendationOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom SME recommendation",
      path: ["smeRecommendationOther"],
    }
  );

// SME Review step schema for when it's required (qty adjustment is non-zero)
export const step3RequiredSchema = z
  .object({
    smeName: z.string().min(1, "SME name is required"),
    smeEmail: z.email("Invalid email address"),
    smeDepartment: z.string().min(1, "SME department is required"),
    smeDepartmentOther: z.string().optional(),
    smeFeedbackMethod: z.string().min(1, "Feedback method is required"),
    smeFeedbackMethodOther: z.string().optional(),
    smeContactedDate: z
      .date()
      .min(new Date(2000, 0, 1), "Contacted date is required"),
    smeRespondedDate: z
      .date()
      .min(new Date(2000, 0, 1), "Responded date is required"),
    smeRecommendation: z.string().min(1, "SME recommendation is required"),
    smeRecommendationOther: z.string().optional(),
    smeRecommendedSafetyStockQty: z.number().optional().nullable(),
    smeRecommendedUnrestrictedQty: z.number().optional().nullable(),
    smeAnalysis: z.string().min(1, "SME analysis is required"),
    smeAlternativeApplications: z
      .string()
      .min(1, "Alternative applications are required"),
    smeRiskAssessment: z.string().min(1, "Risk assessment is required"),
  })
  .refine(
    (data) => {
      // Ensure contacted date is before or on the responded date
      return data.smeContactedDate <= data.smeRespondedDate;
    },
    {
      message: "Contacted date must be before or on the responded date",
      path: ["smeRespondedDate"],
    }
  )
  .refine(
    (data) => {
      if (data.smeDepartment === "other") {
        return !!data.smeDepartmentOther && data.smeDepartmentOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom department",
      path: ["smeDepartmentOther"],
    }
  )
  .refine(
    (data) => {
      if (data.smeFeedbackMethod === "other") {
        return !!data.smeFeedbackMethodOther && data.smeFeedbackMethodOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom feedback method",
      path: ["smeFeedbackMethodOther"],
    }
  )
  .refine(
    (data) => {
      if (data.smeRecommendation === "other") {
        return !!data.smeRecommendationOther && data.smeRecommendationOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom SME recommendation",
      path: ["smeRecommendationOther"],
    }
  );

// Assignment step schema - required fields for SME and approver assignment
export const stepAssignmentSchema = z.object({
  smeUserId: z.string().uuid("SME assignment is required"),
  approverUserId: z.string().uuid("Approver assignment is required"),
});

// Follow-up Review Scheduling
export const step4Schema = z
  .object({
    scheduleFollowUp: z.boolean(),
    scheduleFollowUpReason: z.string().optional(),
    scheduleFollowUpReasonOther: z.string().optional(),
    scheduleFollowUpDate: z.date().optional(),
    scheduleReviewFrequencyWeeks: z.number().optional(),
  })
  .refine(
    (data) => {
      // If follow-up is scheduled, require the follow-up fields
      if (data.scheduleFollowUp) {
        return (
          !!data.scheduleFollowUpReason &&
          data.scheduleFollowUpReason.trim().length > 0 &&
          !!data.scheduleFollowUpDate &&
          typeof data.scheduleReviewFrequencyWeeks === 'number'
        );
      }
      return true;
    },
    {
      message:
        "All follow-up fields are required when scheduling a follow-up review",
      path: ["scheduleFollowUp"],
    }
  )
  .refine(
    (data) => {
      if (data.scheduleFollowUpReason === "other") {
        return !!data.scheduleFollowUpReasonOther && data.scheduleFollowUpReasonOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom follow-up reason",
      path: ["scheduleFollowUpReasonOther"],
    }
  );

// Final decision step
export const step5Schema = z
  .object({
    finalDecision: z.string().min(1, "Final decision is required"),
    finalDecisionOther: z.string().optional(),
    finalSafetyStockQty: z.number().optional().nullable(),
    finalUnrestrictedQty: z.number().optional().nullable(),
    finalNotes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.finalDecision === "other") {
        return !!data.finalDecisionOther && data.finalDecisionOther.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the custom final decision",
      path: ["finalDecisionOther"],
    }
  );

// Combined schema with all fields optional (for form state)
// Individual step schemas remain strict for validation
const step1SchemaOptional = step1Schema.partial();
const step2SchemaOptional = step2Schema.partial();
const stepAssignmentSchemaOptional = stepAssignmentSchema.partial();
const step3SchemaOptional = step3Schema.partial();
const step4SchemaOptional = step4Schema.partial();
const step5SchemaOptional = step5Schema.partial();

export const CombinedMaterialReviewSchema = step1SchemaOptional
  .merge(step2SchemaOptional)
  .merge(stepAssignmentSchemaOptional)
  .merge(step3SchemaOptional)
  .merge(step4SchemaOptional)
  .merge(step5SchemaOptional);

export type MaterialReviewFormData = z.infer<
  typeof CombinedMaterialReviewSchema
>;
