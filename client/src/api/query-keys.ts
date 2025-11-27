/**
 * Query key factory for type-safe cache management
 * This pattern ensures consistent query keys across the application
 */

export interface MaterialsQueryParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  search?: string;
  // Filter parameters
  material_type?: string[];
  min_total_value?: number;
  max_total_value?: number;
  min_total_quantity?: number;
  max_total_quantity?: number;
  last_reviewed_filter?: string;
  next_review_filter?: string;
  has_reviews?: boolean;
  has_errors?: boolean;
  has_warnings?: boolean;
}

export interface AuditLogsQueryParams {
  skip?: number;
  limit?: number;
  table_name?: string;
  record_id?: number;
  operation?: string;
  changed_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface MaterialAuditLogsQueryParams {
  skip?: number;
  limit?: number;
  material_number?: number;
  date_from?: string;
  date_to?: string;
}

export interface ReviewCommentsQueryParams {
  skip?: number;
  limit?: number;
}

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

  // Review comments queries
  reviewComments: {
    all: ["reviewComments"] as const,
    // Comments for a specific review
    list: (materialNumber: number, reviewId: number, params?: ReviewCommentsQueryParams) =>
      [...queryKeys.reviewComments.all, "list", materialNumber, reviewId, params] as const,
  },

  // User queries
  user: {
    all: ["user"] as const,
    current: () => [...queryKeys.user.all, "current"] as const,
  },
} as const;
