/**
 * Query key factory for type-safe cache management
 * This pattern ensures consistent query keys across the application
 */
import type {
  MaterialsQueryParams,
  AuditLogsQueryParams,
  MaterialAuditLogsQueryParams,
  ReviewCommentsQueryParams,
  UploadJobsQueryParams,
} from "@/types/materials";

export type {
  MaterialsQueryParams,
  AuditLogsQueryParams,
  MaterialAuditLogsQueryParams,
  ReviewCommentsQueryParams,
  UploadJobsQueryParams,
};

export const queryKeys = {
  // All material-related queries
  materials: {
    // All materials queries (useful for invalidating everything)
    all: ["materials"] as const,

    // List of materials with filters/pagination
    list: (params?: MaterialsQueryParams) =>
      [...queryKeys.materials.all, "list", params] as const,

    // Single material detail
    detail: (materialNumber: number) =>
      [...queryKeys.materials.all, "detail", materialNumber] as const,

    // Material reviews (can be used for granular invalidation)
    reviews: (materialNumber: number) =>
      [...queryKeys.materials.detail(materialNumber), "reviews"] as const,

    // Material history
    history: (materialNumber: number) =>
      [...queryKeys.materials.detail(materialNumber), "history"] as const,
  },

  // Health check query (if needed in the future)
  health: ["health"] as const,

  // Audit logs queries
  auditLogs: {
    all: ["auditLogs"] as const,
    list: (params?: AuditLogsQueryParams) =>
      [...queryKeys.auditLogs.all, "list", params] as const,
  },

  // Material audit logs queries (human-readable)
  materialAuditLogs: {
    all: ["materialAuditLogs"] as const,
    list: (params?: MaterialAuditLogsQueryParams) =>
      [...queryKeys.materialAuditLogs.all, "list", params] as const,
  },

  // Review queries
  reviews: {
    all: ["reviews"] as const,
    // Single review detail
    detail: (materialNumber: number, reviewId: number) =>
      [...queryKeys.reviews.all, "detail", materialNumber, reviewId] as const,
  },

  // Review comments queries
  reviewComments: {
    all: ["reviewComments"] as const,
    // Comments for a specific review
    list: (
      materialNumber: number,
      reviewId: number,
      params?: ReviewCommentsQueryParams
    ) =>
      [
        ...queryKeys.reviewComments.all,
        "list",
        materialNumber,
        reviewId,
        params,
      ] as const,
  },

  // User queries
  user: {
    all: ["user"] as const,
    current: () => [...queryKeys.user.all, "current"] as const,
  },

  // Upload jobs queries
  uploadJobs: {
    all: ["uploadJobs"] as const,
    list: (params?: UploadJobsQueryParams) =>
      [...queryKeys.uploadJobs.all, "list", params] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all, "summary"] as const,
    recentActivity: () => [...queryKeys.dashboard.all, "recentActivity"] as const,
  },

  // Lookup options queries
  lookups: {
    all: ["lookups"] as const,
    byCategory: (category: string, includeInactive?: boolean) =>
      [...queryKeys.lookups.all, "category", category, { includeInactive }] as const,
    allCategories: (includeInactive?: boolean) =>
      [...queryKeys.lookups.all, "allCategories", { includeInactive }] as const,
    detail: (optionId: number) =>
      [...queryKeys.lookups.all, "detail", optionId] as const,
    history: (optionId: number) =>
      [...queryKeys.lookups.all, "history", optionId] as const,
  },

  // RBAC queries
  roles: {
    all: ["roles"] as const,
    list: (params?: { includeInactive?: boolean; roleType?: string }) =>
      [...queryKeys.roles.all, "list", params] as const,
    detail: (roleId: number) =>
      [...queryKeys.roles.all, "detail", roleId] as const,
  },

  userRoles: {
    all: ["userRoles"] as const,
    list: (params?: { userId?: string; roleId?: number; includeInactive?: boolean }) =>
      [...queryKeys.userRoles.all, "list", params] as const,
  },

  smeExpertise: {
    all: ["smeExpertise"] as const,
    list: (params?: { userId?: string; smeType?: string; isAvailable?: boolean }) =>
      [...queryKeys.smeExpertise.all, "list", params] as const,
  },

  usersList: {
    all: ["usersList"] as const,
    list: (params?: { search?: string; isActive?: boolean }) =>
      [...queryKeys.usersList.all, "list", params] as const,
  },

  // Notification queries
  notifications: {
    all: ["notifications"] as const,
    list: (params?: { skip?: number; limit?: number; unread_only?: boolean }) =>
      [...queryKeys.notifications.all, "list", params] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unreadCount"] as const,
    preferences: () => [...queryKeys.notifications.all, "preferences"] as const,
  },

  // Review assignments queries
  reviewAssignments: {
    all: ["reviewAssignments"] as const,
    detail: (materialNumber: number, reviewId: number) =>
      [...queryKeys.reviewAssignments.all, materialNumber, reviewId] as const,
  },
} as const;
