/**
 * React Query hooks for API calls
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  apiClient,
  MaterialReviewUpdate,
  UploadSAPDataResponse,
  PaginatedReviewCommentsResponse,
  ReviewComment,
  ReviewCommentCreate,
  UserResponse,
} from "./client";
import {
  queryKeys,
  MaterialsQueryParams,
  AuditLogsQueryParams,
  MaterialAuditLogsQueryParams,
  ReviewCommentsQueryParams,
} from "./query-keys";
import type { components } from "@/types/api";

type PaginatedMaterialsResponse =
  components["schemas"]["PaginatedMaterialsResponse"];
type MaterialWithReviews = components["schemas"]["MaterialWithReviews"];
type MaterialReview = components["schemas"]["MaterialReview"];
type PaginatedAuditLogsResponse =
  components["schemas"]["PaginatedAuditLogsResponse"];
type PaginatedMaterialAuditLogsResponse =
  components["schemas"]["PaginatedMaterialAuditLogsResponse"];

/**
 * Hook to fetch paginated materials list
 * @param params Query parameters for pagination, sorting, and filtering
 */
export function useMaterials(
  params?: MaterialsQueryParams
): UseQueryResult<PaginatedMaterialsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.materials.list(params),
    queryFn: () => apiClient.getMaterials(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to fetch material details with reviews
 * @param materialNumber The material number to fetch
 * @param enabled Whether the query should run (default: true)
 */
export function useMaterialDetails(
  materialNumber: number | null,
  enabled: boolean = true
): UseQueryResult<MaterialWithReviews | null, Error> {
  return useQuery({
    queryKey: queryKeys.materials.detail(materialNumber!),
    queryFn: () => apiClient.getMaterialDetails(materialNumber!),
    enabled: enabled && materialNumber !== null,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to update a review with optimistic updates
 */
export function useUpdateReview(): UseMutationResult<
  MaterialReview,
  Error,
  {
    materialNumber: number;
    reviewId: number;
    step: number;
    data: MaterialReviewUpdate;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialNumber, reviewId, step, data }) =>
      apiClient.updateReview(materialNumber, reviewId, step, data),
    onMutate: async ({ materialNumber, reviewId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.materials.detail(materialNumber),
      });

      // Snapshot previous value for rollback
      const previousMaterial = queryClient.getQueryData<MaterialWithReviews>(
        queryKeys.materials.detail(materialNumber)
      );

      // Optimistically update the cache
      if (previousMaterial) {
        const extendedReviews = previousMaterial.reviews as MaterialReview[];
        queryClient.setQueryData<MaterialWithReviews>(
          queryKeys.materials.detail(materialNumber),
          {
            ...previousMaterial,
            reviews: extendedReviews.map((review) =>
              review.review_id === reviewId ? ({ ...review, ...data } as MaterialReview) : review
            ),
          }
        );
      }

      return { previousMaterial };
    },
    onError: (err, { materialNumber }, context) => {
      // Rollback optimistic update on error
      if (context?.previousMaterial) {
        queryClient.setQueryData(
          queryKeys.materials.detail(materialNumber),
          context.previousMaterial
        );
      }
      console.error("Failed to update review:", err);
    },
    onSuccess: (_data, { materialNumber }) => {
      // Invalidate and refetch to get server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.all,
      });
    },
  });
}

/**
 * Hook to cancel a review with optimistic updates
 */
export function useCancelReview(): UseMutationResult<
  { message: string },
  Error,
  { materialNumber: number; reviewId: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialNumber, reviewId }) =>
      apiClient.cancelReview(materialNumber, reviewId),
    onMutate: async ({ materialNumber, reviewId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.materials.detail(materialNumber),
      });

      // Snapshot previous value for rollback
      const previousMaterial = queryClient.getQueryData<MaterialWithReviews>(
        queryKeys.materials.detail(materialNumber)
      );

      // Optimistically update the cache
      if (previousMaterial) {
        const extendedReviews = previousMaterial.reviews as MaterialReview[];
        queryClient.setQueryData<MaterialWithReviews>(
          queryKeys.materials.detail(materialNumber),
          {
            ...previousMaterial,
            reviews: extendedReviews.filter(
              (review) => review.review_id !== reviewId
            ),
            reviews_count: Math.max(
              (previousMaterial.reviews_count || 1) - 1,
              0
            ),
          }
        );
      }

      return { previousMaterial };
    },
    onError: (err, { materialNumber }, context) => {
      // Rollback optimistic update on error
      if (context?.previousMaterial) {
        queryClient.setQueryData(
          queryKeys.materials.detail(materialNumber),
          context.previousMaterial
        );
      }
      console.error("Failed to cancel review:", err);
    },
    onSuccess: (_data, { materialNumber }) => {
      // Invalidate and refetch to get server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.all,
      });
    },
  });
}

/**
 * Hook to fetch paginated audit logs
 * @param params Query parameters for pagination and filtering
 */
export function useAuditLogs(
  params?: AuditLogsQueryParams
): UseQueryResult<PaginatedAuditLogsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(params),
    queryFn: () => apiClient.getAuditLogs(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to fetch paginated material audit logs (human-readable)
 * @param params Query parameters for pagination and filtering
 */
export function useMaterialAuditLogs(
  params?: MaterialAuditLogsQueryParams
): UseQueryResult<PaginatedMaterialAuditLogsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.materialAuditLogs.list(params),
    queryFn: () => apiClient.getMaterialAuditLogs(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to upload SAP CSV data
 */
export function useUploadSAPData(): UseMutationResult<
  UploadSAPDataResponse,
  Error,
  File
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => apiClient.uploadSAPData(file),
    onSuccess: () => {
      // Invalidate materials list to refetch with new data
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.all,
      });
    },
    onError: (error) => {
      console.error("Failed to upload SAP data:", error);
    },
  });
}

/**
 * Hook to fetch paginated review comments
 * @param materialNumber The material number
 * @param reviewId The review ID
 * @param params Query parameters for pagination
 * @param enabled Whether the query should run (default: true)
 */
export function useReviewComments(
  materialNumber: number | null,
  reviewId: number | null,
  params?: ReviewCommentsQueryParams,
  enabled: boolean = true
): UseQueryResult<PaginatedReviewCommentsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.reviewComments.list(materialNumber!, reviewId!, params),
    queryFn: () => apiClient.getReviewComments(materialNumber!, reviewId!, params),
    enabled: enabled && materialNumber !== null && reviewId !== null,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to create a new review comment
 */
export function useCreateReviewComment(): UseMutationResult<
  ReviewComment,
  Error,
  {
    materialNumber: number;
    reviewId: number;
    data: ReviewCommentCreate;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialNumber, reviewId, data }) =>
      apiClient.createReviewComment(materialNumber, reviewId, data),
    onSuccess: (_data, { materialNumber, reviewId }) => {
      // Invalidate all comment queries for this review (regardless of pagination params)
      queryClient.invalidateQueries({
        queryKey: ["reviewComments", "list", materialNumber, reviewId],
      });
    },
    onError: (error) => {
      console.error("Failed to create comment:", error);
    },
  });
}

/**
 * Hook to delete a review comment
 */
export function useDeleteReviewComment(): UseMutationResult<
  { message: string },
  Error,
  {
    commentId: number;
    materialNumber: number;
    reviewId: number;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }) => apiClient.deleteReviewComment(commentId),
    onSuccess: (_data, { materialNumber, reviewId }) => {
      // Invalidate all comment queries for this review (regardless of pagination params)
      queryClient.invalidateQueries({
        queryKey: ["reviewComments", "list", materialNumber, reviewId],
      });
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
    },
  });
}

/**
 * Hook to fetch current user profile
 */
export function useCurrentUser(): UseQueryResult<UserResponse, Error> {
  return useQuery({
    queryKey: queryKeys.user.current(),
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
