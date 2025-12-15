/**
 * Debug review data generators for testing the material review workflow.
 * Only used in development mode via the Debug FAB.
 */

import type { MaterialReviewUpdate } from "@/api/client";

/**
 * Generate Step 1 (General Info) data
 */
export function generateStep1Data(): MaterialReviewUpdate {
  return {
    review_reason: "Debug test review - surplus stock identified",
    current_stock_qty: Math.floor(Math.random() * 1000) + 100,
    current_stock_value: Math.floor(Math.random() * 50000) + 5000,
    months_no_movement: Math.floor(Math.random() * 24) + 6,
    proposed_action: "Write-off or dispose of excess inventory",
    proposed_safety_stock_qty: Math.floor(Math.random() * 250) + 25,
    proposed_unrestricted_qty: Math.floor(Math.random() * 250) + 25,
    business_justification:
      "Stock has not moved in significant time and is no longer required for operations. Recommend disposal to free up warehouse space and recover capital.",
  };
}

/**
 * Generate Step 2 (Checklist) data
 */
export function generateStep2Data(): MaterialReviewUpdate {
  return {
    has_open_orders: false,
    has_forecast_demand: false,
    checked_alternate_plants: true,
    contacted_procurement: true,
    reviewed_bom_usage: true,
    checked_supersession: true,
    checked_historical_usage: true,
    open_order_numbers: null,
    forecast_next_12m: 0,
    alternate_plant_qty: 0,
    procurement_feedback: "No planned purchases or requirements identified",
  };
}

/**
 * Generate Step 3 (SME Investigation) data
 */
export function generateStep3Data(): MaterialReviewUpdate {
  const contactedDate = new Date();
  contactedDate.setDate(contactedDate.getDate() - 7);

  const respondedDate = new Date();
  respondedDate.setDate(respondedDate.getDate() - 3);

  return {
    sme_name: "Debug Test SME",
    sme_email: "debug.sme@test.com",
    sme_department: "Operations",
    sme_feedback_method: "Email",
    sme_contacted_date: contactedDate.toISOString().split("T")[0],
    sme_responded_date: respondedDate.toISOString().split("T")[0],
    sme_recommendation: "Approve disposal - no operational requirement",
    sme_recommended_safety_stock_qty: 0,
    sme_recommended_unrestricted_qty: 0,
    sme_analysis:
      "Material has no current use case and no foreseeable demand. Recommend full disposal.",
    alternative_applications: "None identified",
    risk_assessment: "Low risk - no operational impact expected",
  };
}

/**
 * Generate Step 4 (Follow-up) data
 */
export function generateStep4Data(): MaterialReviewUpdate {
  const nextReviewDate = new Date();
  nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);

  return {
    requires_follow_up: false,
    next_review_date: nextReviewDate.toISOString().split("T")[0],
    follow_up_reason: null,
    review_frequency_weeks: 26,
    estimated_savings: Math.floor(Math.random() * 10000) + 1000,
    implementation_date: new Date().toISOString().split("T")[0],
  };
}

/**
 * Generate Step 5 (Final Decision) data
 */
export function generateStep5Data(): MaterialReviewUpdate {
  return {
    final_decision: "Approved for disposal - debug test completion",
    final_safety_stock_qty: Math.floor(Math.random() * 250) + 25,
    final_unrestricted_qty: Math.floor(Math.random() * 250) + 25,
    final_notes:
      "Review completed via debug FAB. All checks passed, SME approved disposal.",
  };
}

/**
 * Generate complete review data for all steps (for creating completed review)
 */
export function generateCompleteReviewData(): {
  step1: MaterialReviewUpdate;
  step2: MaterialReviewUpdate;
  step3: MaterialReviewUpdate;
  step4: MaterialReviewUpdate;
  step5: MaterialReviewUpdate;
} {
  return {
    step1: generateStep1Data(),
    step2: generateStep2Data(),
    step3: generateStep3Data(),
    step4: generateStep4Data(),
    step5: generateStep5Data(),
  };
}
