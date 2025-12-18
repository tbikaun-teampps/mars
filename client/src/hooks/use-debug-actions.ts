/**
 * Debug actions hook for creating/managing reviews in development mode.
 * Provides one-click actions to create reviews at various statuses.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";
import {
  generateCompleteReviewData,
  generateStep1Data,
  generateStep2Data,
  generateStep3Data,
} from "@/lib/debug-review-data";
import type { MaterialReview } from "@/types/materials";

export type ReviewStatus = "draft" | "pending_sme" | "pending_decision" | "approved";

// Order of statuses for progression
const STATUS_ORDER: ReviewStatus[] = ["draft", "pending_sme", "pending_decision", "approved"];

/**
 * Get the index of a status in the progression order
 */
export function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status as ReviewStatus);
}

/**
 * Check if we can advance from current status to target status
 */
export function canAdvanceTo(currentStatus: string | null, targetStatus: ReviewStatus): boolean {
  if (!currentStatus) return true; // No review = can create at any status
  const currentIndex = getStatusIndex(currentStatus);
  const targetIndex = getStatusIndex(targetStatus);
  return targetIndex > currentIndex;
}

/**
 * Hook providing debug actions for material reviews
 */
export function useDebugActions() {
  const queryClient = useQueryClient();

  const invalidateQueries = (materialNumber: number) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.materials.detail(materialNumber),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.materials.all,
    });
  };

  /**
   * Create a new review at a specific status (when no active review exists)
   */
  const createAtStatus = useMutation({
    mutationFn: async ({
      materialNumber,
      targetStatus,
    }: {
      materialNumber: number;
      targetStatus: ReviewStatus;
    }): Promise<MaterialReview> => {
      // Step 1: Create the review (starts as draft after step 1)
      const review = await apiClient.createReview(materialNumber, {
        ...generateStep1Data(),
      });

      if (targetStatus === "draft") {
        return review;
      }

      // Step 2: Update with checklist (moves to pending_sme)
      const step2Data = generateStep2Data();
      const afterStep2 = await apiClient.updateReview(
        materialNumber,
        review.review_id!,
        1, // step index for checklist
        step2Data
      );

      if (targetStatus === "pending_sme") {
        return afterStep2;
      }

      // Step 3: Update with SME investigation (moves to pending_decision)
      const step3Data = generateStep3Data();
      const afterStep3 = await apiClient.updateReview(
        materialNumber,
        review.review_id!,
        2, // step index for sme_investigation
        step3Data
      );

      if (targetStatus === "pending_decision") {
        return afterStep3;
      }

      // For completed, we need all steps
      const completeData = generateCompleteReviewData();

      // Step 4: Follow-up
      await apiClient.updateReview(
        materialNumber,
        review.review_id!,
        3, // step index for follow_up
        completeData.step4
      );

      // Step 5: Final decision (completes the review)
      const completed = await apiClient.updateReview(
        materialNumber,
        review.review_id!,
        4, // step index for final_decision
        completeData.step5
      );

      return completed;
    },
    onSuccess: (_data, { materialNumber }) => {
      invalidateQueries(materialNumber);
    },
  });

  /**
   * Advance an existing review to a target status
   */
  const advanceToStatus = useMutation({
    mutationFn: async ({
      materialNumber,
      reviewId,
      currentStatus,
      targetStatus,
    }: {
      materialNumber: number;
      reviewId: number;
      currentStatus: string;
      targetStatus: ReviewStatus;
    }): Promise<MaterialReview> => {
      const currentIndex = getStatusIndex(currentStatus);
      const targetIndex = getStatusIndex(targetStatus);

      if (targetIndex <= currentIndex) {
        throw new Error("Cannot go backwards in review status");
      }

      let result: MaterialReview | null = null;
      const completeData = generateCompleteReviewData();

      // Apply each step needed to reach target status
      // draft (0) -> pending_sme (1): needs step 2 (checklist)
      // pending_sme (1) -> pending_decision (2): needs step 3 (SME)
      // pending_decision (2) -> completed (3): needs steps 4 & 5

      if (currentIndex < 1 && targetIndex >= 1) {
        // Need to do step 2 (checklist) to get to pending_sme
        result = await apiClient.updateReview(
          materialNumber,
          reviewId,
          1,
          completeData.step2
        );
      }

      if (currentIndex < 2 && targetIndex >= 2) {
        // Need to do step 3 (SME) to get to pending_decision
        result = await apiClient.updateReview(
          materialNumber,
          reviewId,
          2,
          completeData.step3
        );
      }

      if (targetIndex >= 3) {
        // Need to do steps 4 & 5 to complete
        await apiClient.updateReview(
          materialNumber,
          reviewId,
          3,
          completeData.step4
        );
        result = await apiClient.updateReview(
          materialNumber,
          reviewId,
          4,
          completeData.step5
        );
      }

      if (!result) {
        throw new Error("No updates were made");
      }

      return result;
    },
    onSuccess: (_data, { materialNumber }) => {
      invalidateQueries(materialNumber);
    },
  });

  /**
   * Cancel an active review
   */
  const cancelReview = useMutation({
    mutationFn: async ({
      materialNumber,
      reviewId,
    }: {
      materialNumber: number;
      reviewId: number;
    }) => {
      return apiClient.cancelReview(materialNumber, reviewId);
    },
    onSuccess: (_data, { materialNumber }) => {
      invalidateQueries(materialNumber);
    },
  });

  return {
    createAtStatus,
    advanceToStatus,
    cancelReview,
    isCreating: createAtStatus.isPending,
    isAdvancing: advanceToStatus.isPending,
    isCancelling: cancelReview.isPending,
  };
}
