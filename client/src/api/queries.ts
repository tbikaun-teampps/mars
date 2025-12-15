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
  UploadJobListResponse,
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
  UploadJobsQueryParams,
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
type MaterialDataHistory = components["schemas"]["MaterialDataHistory"];

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
              review.review_id === reviewId
                ? ({ ...review, ...data } as MaterialReview)
                : review
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

      // Invalidate dashboard summary as metrics might have changed (acceptance, overdue, etc.)
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
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
      // Invalidate upload jobs list to show new upload in history
      queryClient.invalidateQueries({
        queryKey: queryKeys.uploadJobs.all,
      });
      // Invalidate dashboard summary as metrics will have changed
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
      });
    },
    onError: (error) => {
      console.error("Failed to upload SAP data:", error);
    },
  });
}

/**
 * Hook to fetch upload job history (paginated list of all upload jobs)
 * @param params Query parameters for pagination, sorting, and filtering
 * @param enabled Whether the query should run (default: true)
 */
export function useUploadJobHistory(
  params?: UploadJobsQueryParams,
  enabled: boolean = true
): UseQueryResult<UploadJobListResponse, Error> {
  return useQuery({
    queryKey: queryKeys.uploadJobs.list(params),
    queryFn: () => apiClient.getUploadJobHistory(params),
    enabled,
    staleTime: 1000 * 60, // 1 minute
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
    queryFn: () =>
      apiClient.getReviewComments(materialNumber!, reviewId!, params),
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

/**
 * Hook to update current user's profile
 */
export function useUpdateProfile(): UseMutationResult<
  UserResponse,
  Error,
  {
    display_name?: string | null;
    phone?: string | null;
    notification_preferences?: { [key: string]: unknown } | null;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.current() });
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
    },
  });
}

/**
 * Hook to acknowledge an insight
 */
export function useAcknowledgeInsight(): UseMutationResult<
  { message: string },
  Error,
  { materialNumber: number; insightId: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialNumber, insightId }) =>
      apiClient.acknowledgeInsight(materialNumber, insightId),
    onSuccess: (_data, { materialNumber }) => {
      // Invalidate material details to refetch with updated insight state
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialNumber),
      });
      // Also invalidate materials list as it may show insight counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.all,
      });
    },
    onError: (error) => {
      console.error("Failed to acknowledge insight:", error);
    },
  });
}

/**
 * Hook to unacknowledge an insight
 */
export function useUnacknowledgeInsight(): UseMutationResult<
  { message: string },
  Error,
  { materialNumber: number; insightId: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ materialNumber, insightId }) =>
      apiClient.unacknowledgeInsight(materialNumber, insightId),
    onSuccess: (_data, { materialNumber }) => {
      // Invalidate material details to refetch with updated insight state
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialNumber),
      });
      // Also invalidate materials list as it may show insight counts
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.all,
      });
    },
    onError: (error) => {
      console.error("Failed to unacknowledge insight:", error);
    },
  });
}

/** Hook to fetch material history
 * @param materialNumber The material number to fetch history for
 * @param enabled Whether the query should run (default: true)
 */
export function useMaterialHistory(
  materialNumber: number | null,
  enabled: boolean = true
): UseQueryResult<MaterialDataHistory[], Error> {
  return useQuery({
    queryKey: queryKeys.materials.history(materialNumber!),
    queryFn: () => {
      if (materialNumber === null) {
        throw new Error(
          "materialNumber cannot be null when fetching material history."
        );
      }
      return apiClient.getMaterialHistory(materialNumber);
    },
    enabled: enabled && materialNumber !== null,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/** Hook to fetch dashboard summary data
 */
export function useDashboardSummary(
  enabled: boolean
): UseQueryResult<components["schemas"]["DashboardSummary"], Error> {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => apiClient.getDashboardSummary(),
    staleTime: 1000 * 60, // 1 minute
    enabled,
  });
}

/** Hook to fetch recent dashboard activity
 */
export function useDashboardRecentActivity(
  enabled: boolean
): UseQueryResult<components["schemas"]["MaterialAuditLogEntry"][], Error> {
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: () => apiClient.getDashboardRecentActivity(),
    staleTime: 1000 * 60, // 1 minute
    enabled,
  });
}

// Lookup options types
type LookupOptionsGrouped = components["schemas"]["LookupOptionsGrouped"];
type LookupOption = components["schemas"]["LookupOption"];
type LookupOptionHistory = components["schemas"]["LookupOptionHistory"];
type LookupOptionCreate = components["schemas"]["LookupOptionCreate"];
type LookupOptionUpdate = components["schemas"]["LookupOptionUpdate"];

/**
 * Hook to fetch lookup options by category (with grouping)
 * @param category The category to fetch (e.g., 'review_reason')
 * @param includeInactive Whether to include inactive options (default: false)
 * @param enabled Whether the query should run (default: true)
 */
export function useLookupOptions(
  category: string,
  includeInactive: boolean = false,
  enabled: boolean = true
): UseQueryResult<LookupOptionsGrouped, Error> {
  return useQuery({
    queryKey: queryKeys.lookups.byCategory(category, includeInactive),
    queryFn: () => apiClient.getLookupOptions(category, includeInactive),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - lookup options rarely change
  });
}

/**
 * Hook to fetch all lookup options grouped by category
 * @param includeInactive Whether to include inactive options (default: false)
 * @param enabled Whether the query should run (default: true)
 */
export function useAllLookupOptions(
  includeInactive: boolean = false,
  enabled: boolean = true
): UseQueryResult<Record<string, LookupOptionsGrouped>, Error> {
  return useQuery({
    queryKey: queryKeys.lookups.allCategories(includeInactive),
    queryFn: () => apiClient.getAllLookupOptions(includeInactive),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a single lookup option by ID
 */
export function useLookupOptionDetail(
  optionId: number | null,
  enabled: boolean = true
): UseQueryResult<LookupOption, Error> {
  return useQuery({
    queryKey: queryKeys.lookups.detail(optionId!),
    queryFn: () => apiClient.getLookupOptionDetail(optionId!),
    enabled: enabled && optionId !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch lookup option change history
 */
export function useLookupOptionHistory(
  optionId: number | null,
  enabled: boolean = true
): UseQueryResult<LookupOptionHistory[], Error> {
  return useQuery({
    queryKey: queryKeys.lookups.history(optionId!),
    queryFn: () => apiClient.getLookupOptionHistory(optionId!),
    enabled: enabled && optionId !== null,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create a new lookup option
 */
export function useCreateLookupOption(): UseMutationResult<
  LookupOption,
  Error,
  LookupOptionCreate
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LookupOptionCreate) => apiClient.createLookupOption(data),
    onSuccess: () => {
      // Invalidate all lookup queries (handles includeInactive parameter variations)
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.all,
      });
    },
    onError: (error) => {
      console.error("Failed to create lookup option:", error);
    },
  });
}

/**
 * Hook to update a lookup option
 */
export function useUpdateLookupOption(): UseMutationResult<
  LookupOption,
  Error,
  { optionId: number; data: LookupOptionUpdate; category: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ optionId, data }) =>
      apiClient.updateLookupOption(optionId, data),
    onSuccess: () => {
      // Invalidate all lookup queries (handles includeInactive parameter variations)
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.all,
      });
    },
    onError: (error) => {
      console.error("Failed to update lookup option:", error);
    },
  });
}

/**
 * Hook to delete (soft-delete) a lookup option
 */
export function useDeleteLookupOption(): UseMutationResult<
  void,
  Error,
  { optionId: number; category: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ optionId }) => apiClient.deleteLookupOption(optionId),
    onSuccess: () => {
      // Invalidate all lookup queries (handles includeInactive parameter variations)
      queryClient.invalidateQueries({
        queryKey: queryKeys.lookups.all,
      });
    },
    onError: (error) => {
      console.error("Failed to delete lookup option:", error);
    },
  });
}

// ============================================================================
// RBAC Hooks
// ============================================================================

// Type aliases for RBAC
type RoleListItem = components["schemas"]["RoleListItem"];
type RoleResponse = components["schemas"]["RoleResponse"];
type UserRoleResponse = components["schemas"]["UserRoleResponse"];
type UserRoleCreate = components["schemas"]["UserRoleCreate"];
type UserRoleUpdate = components["schemas"]["UserRoleUpdate"];
type SMEExpertiseResponse = components["schemas"]["SMEExpertiseResponse"];
type SMEExpertiseCreate = components["schemas"]["SMEExpertiseCreate"];
type SMEExpertiseUpdate = components["schemas"]["SMEExpertiseUpdate"];
type UserListItem = components["schemas"]["UserListItem"];

/**
 * Hook to fetch all roles
 * @param params Filter parameters
 * @param enabled Whether the query should run (default: true)
 */
export function useRoles(
  params?: { includeInactive?: boolean; roleType?: string },
  enabled: boolean = true
): UseQueryResult<RoleListItem[], Error> {
  return useQuery({
    queryKey: queryKeys.roles.list(params),
    queryFn: () => apiClient.getRoles(params),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - roles rarely change
  });
}

/**
 * Hook to fetch a single role by ID
 */
export function useRole(
  roleId: number | null,
  enabled: boolean = true
): UseQueryResult<RoleResponse, Error> {
  return useQuery({
    queryKey: queryKeys.roles.detail(roleId!),
    queryFn: () => apiClient.getRole(roleId!),
    enabled: enabled && roleId !== null,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch user-role assignments
 * @param params Filter parameters
 * @param enabled Whether the query should run (default: true)
 */
export function useUserRoles(
  params?: { userId?: string; roleId?: number; includeInactive?: boolean },
  enabled: boolean = true
): UseQueryResult<UserRoleResponse[], Error> {
  return useQuery({
    queryKey: queryKeys.userRoles.list(params),
    queryFn: () => apiClient.getUserRoles(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to create a user-role assignment
 */
export function useCreateUserRole(): UseMutationResult<
  UserRoleResponse,
  Error,
  UserRoleCreate
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserRoleCreate) => apiClient.createUserRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userRoles.all });
    },
    onError: (error) => {
      console.error("Failed to create user role:", error);
    },
  });
}

/**
 * Hook to update a user-role assignment
 */
export function useUpdateUserRole(): UseMutationResult<
  UserRoleResponse,
  Error,
  { userRoleId: number; data: UserRoleUpdate }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userRoleId, data }) =>
      apiClient.updateUserRole(userRoleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userRoles.all });
    },
    onError: (error) => {
      console.error("Failed to update user role:", error);
    },
  });
}

/**
 * Hook to revoke (soft-delete) a user-role assignment
 */
export function useDeleteUserRole(): UseMutationResult<
  void,
  Error,
  number
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userRoleId: number) => apiClient.deleteUserRole(userRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userRoles.all });
    },
    onError: (error) => {
      console.error("Failed to delete user role:", error);
    },
  });
}

/**
 * Hook to fetch SME expertise records
 * @param params Filter parameters
 * @param enabled Whether the query should run (default: true)
 */
export function useSMEExpertise(
  params?: { userId?: string; smeType?: string; isAvailable?: boolean },
  enabled: boolean = true
): UseQueryResult<SMEExpertiseResponse[], Error> {
  return useQuery({
    queryKey: queryKeys.smeExpertise.list(params),
    queryFn: () => apiClient.getSMEExpertise(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to create an SME expertise record
 */
export function useCreateSMEExpertise(): UseMutationResult<
  SMEExpertiseResponse,
  Error,
  SMEExpertiseCreate
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SMEExpertiseCreate) => apiClient.createSMEExpertise(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.smeExpertise.all });
    },
    onError: (error) => {
      console.error("Failed to create SME expertise:", error);
    },
  });
}

/**
 * Hook to update an SME expertise record
 */
export function useUpdateSMEExpertise(): UseMutationResult<
  SMEExpertiseResponse,
  Error,
  { expertiseId: number; data: SMEExpertiseUpdate }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expertiseId, data }) =>
      apiClient.updateSMEExpertise(expertiseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.smeExpertise.all });
    },
    onError: (error) => {
      console.error("Failed to update SME expertise:", error);
    },
  });
}

/**
 * Hook to delete an SME expertise record
 */
export function useDeleteSMEExpertise(): UseMutationResult<
  void,
  Error,
  number
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expertiseId: number) =>
      apiClient.deleteSMEExpertise(expertiseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.smeExpertise.all });
    },
    onError: (error) => {
      console.error("Failed to delete SME expertise:", error);
    },
  });
}

/**
 * Hook to fetch users list for picker components
 * @param params Filter parameters
 * @param enabled Whether the query should run (default: true)
 */
export function useUsersList(
  params?: { search?: string; isActive?: boolean },
  enabled: boolean = true
): UseQueryResult<UserListItem[], Error> {
  return useQuery({
    queryKey: queryKeys.usersList.list(params),
    queryFn: () => apiClient.getUsers(params),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}
