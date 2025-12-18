import { components } from "@/types/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Step name constants - ordered array for UI navigation
export const STEP_NAMES = [
  "general_info",
  "checklist",
  "assignment",
  "sme_investigation",
  "follow_up",
  "final_decision",
] as const;

export type StepName = (typeof STEP_NAMES)[number];

// Convert step name to index for UI navigation
export function stepNameToIndex(stepName: string): number {
  const index = STEP_NAMES.indexOf(stepName as StepName);
  return index >= 0 ? index : 0;
}

// Convert step index to name for API communication
export function stepIndexToName(index: number): StepName {
  return STEP_NAMES[index] ?? "general_info";
}

// Convert array of step names to indices
export function stepNamesToIndices(stepNames: string[]): number[] {
  return stepNames.map(stepNameToIndex);
}

export function getMaterialReviewStatusBadgeColor(
  status: components["schemas"]["MaterialReview"]["status"]
) {
  switch (status.toLowerCase()) {
    case "draft":
      return "bg-yellow-500/10 border-yellow-500 text-yellow-500";
    case "pending_sme":
      return "bg-blue-500/10 border-blue-500 text-blue-500";
    case "pending_decision":
      return "bg-purple-500/10 border-purple-500 text-purple-500";
    case "approved":
      return "bg-green-500/10 border-green-500 text-green-500";
    case "rejected":
      return "bg-red-500/10 border-red-500 text-red-500";
    case "cancelled":
      return "bg-red-500/10 border-red-500 text-red-500";
    default:
      return "bg-gray-500/10 border-gray-500 text-gray-500";
  }
}

export function getMaterialTypeColor(
  type: components["schemas"]["Material"]["material_type"]
) {
  switch (type) {
    case "CHEM":
      return "red";
    case "CORE":
      return "indigo";
    case "FING":
      return "green";
    case "OPER":
      return "orange";
    case "RAWM":
      return "yellow";
    case "ROTG":
      return "teal";
    case "SPRS":
      return "blue";
    case "OTHER":
    default:
      return "gray";
  }
}

export function getMaterialTypeHexColor(type: string): string {
  switch (type) {
    case "CHEM":
      return "#ef4444"; // red-500
    case "CORE":
      return "#6366f1"; // indigo-500
    case "FING":
      return "#22c55e"; // green-500
    case "OPER":
      return "#f97316"; // orange-500
    case "RAWM":
      return "#eab308"; // yellow-500
    case "ROTG":
      return "#14b8a6"; // teal-500
    case "SPRS":
      return "#3b82f6"; // blue-500
    default:
      return "#6b7280"; // gray-500
  }
}

/**
 * Determines which review steps are locked based on the current review status.
 *
 * Step-based locking enforces immutability after workflow progression:
 * - Draft/Pending Assignment: Steps 0-2 editable (General Info, Checklist, Assignment)
 * - Pending SME: Only Step 3 editable (SME Investigation)
 * - Pending Decision: Steps 4-5 editable (Follow-up, Final Decision)
 * - Terminal states: All steps locked
 *
 * @param status - The current review status
 * @returns Object with isStepLocked function and array of locked step indices
 */
export function getStepLockingForStatus(
  status: string | undefined
): {
  isStepLocked: (stepIndex: number) => boolean;
  lockedSteps: number[];
  editableSteps: number[];
} {
  const terminalStatuses = ["approved", "rejected", "cancelled"];

  // No status means new review - treat as draft (steps 0-2 editable)
  if (!status) {
    return {
      isStepLocked: (step: number) => step > 2,
      lockedSteps: [3, 4, 5],
      editableSteps: [0, 1, 2],
    };
  }

  // Terminal states: all steps locked
  if (terminalStatuses.includes(status.toLowerCase())) {
    return {
      isStepLocked: () => true,
      lockedSteps: [0, 1, 2, 3, 4, 5],
      editableSteps: [],
    };
  }

  const normalizedStatus = status.toLowerCase();

  // Draft or Pending Assignment: Steps 0-2 editable
  if (normalizedStatus === "draft" || normalizedStatus === "pending_assignment") {
    return {
      isStepLocked: (step: number) => step > 2,
      lockedSteps: [3, 4, 5],
      editableSteps: [0, 1, 2],
    };
  }

  // Pending SME: Only Step 3 editable
  if (normalizedStatus === "pending_sme") {
    return {
      isStepLocked: (step: number) => step !== 3,
      lockedSteps: [0, 1, 2, 4, 5],
      editableSteps: [3],
    };
  }

  // Pending Decision: Steps 4-5 editable
  if (normalizedStatus === "pending_decision") {
    return {
      isStepLocked: (step: number) => step < 4,
      lockedSteps: [0, 1, 2, 3],
      editableSteps: [4, 5],
    };
  }

  // Default: all editable (shouldn't reach here with valid statuses)
  return {
    isStepLocked: () => false,
    lockedSteps: [],
    editableSteps: [0, 1, 2, 3, 4, 5],
  };
}
