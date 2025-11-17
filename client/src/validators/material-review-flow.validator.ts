import { z } from "zod";

// General information step
export const step1Schema = z
  .object({
    reviewReason: z.string().min(1, "Review reason is required"),
    reviewReasonOther: z.string().optional(),
    currentStockQty: z.number({
      message: "Current stock quantity is required",
    }),
    currentStockValue: z.number({
      message: "Current stock value is required",
    }),
    monthsNoMovement: z
      .number({
        message: "Months with no movement is required",
      })
      .min(0, "Months with no movement cannot be negative"),
    proposedAction: z.string().min(1, "Proposed action is required"),
    proposedQtyAdjustment: z.number({
      message: "Proposed quantity adjustment is required",
    }),
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

// SME Review step (now mandatory)
export const step3Schema = z
  .object({
    smeName: z.string().min(1, "SME name is required"),
    smeEmail: z.email("Invalid email address"),
    smeDepartment: z.string().min(1, "SME department is required"),
    smeFeedbackMethod: z.string().min(1, "Feedback method is required"),
    smeContactedDate: z
      .date()
      .min(new Date(2000, 0, 1), "Contacted date is required"),
    smeRespondedDate: z
      .date()
      .min(new Date(2000, 0, 1), "Responded date is required"),
    smeRecommendation: z.string().min(1, "SME recommendation is required"),
    smeRecommendedQty: z.number({
      message: "A recommended quantity is required",
    }),
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
  );

// Follow-up Review Scheduling
export const step4Schema = z
  .object({
    scheduleFollowUp: z.boolean(),
    scheduleFollowUpReason: z.string().optional(),
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
      // If follow-up is scheduled, ensure the date is in the future
      if (data.scheduleFollowUp && data.scheduleFollowUpDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
        const reviewDate = new Date(data.scheduleFollowUpDate);
        reviewDate.setHours(0, 0, 0, 0); // Reset time for fair comparison
        return reviewDate >= today;
      }
      return true;
    },
    {
      message: "Follow-up date must be today or in the future",
      path: ["scheduleFollowUpDate"],
    }
  );

// Final decision step
export const step5Schema = z.object({
  finalDecision: z.string().min(1, "Final decision is required"),
  finalQtyAdjustment: z.number({
    message: "Final quantity adjustment is required",
  }),
  finalNotes: z.string().optional(),
});

// Combined schema with all fields optional (for form state)
// Individual step schemas remain strict for validation
const step1SchemaOptional = step1Schema.partial();
const step2SchemaOptional = step2Schema.partial();
const step3SchemaOptional = step3Schema.partial();
const step4SchemaOptional = step4Schema.partial();
const step5SchemaOptional = step5Schema.partial();

export const CombinedMaterialReviewSchema = step1SchemaOptional
  .merge(step2SchemaOptional)
  .merge(step3SchemaOptional)
  .merge(step4SchemaOptional)
  .merge(step5SchemaOptional);

export type MaterialReviewFormData = z.infer<
  typeof CombinedMaterialReviewSchema
>;
