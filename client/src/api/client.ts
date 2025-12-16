/**
 * API client for communicating with the FastAPI backend.
 *
 * The backend URL is proxied through Vite in development (see vite.config.ts).
 * In production, you should set VITE_API_URL environment variable.
 */

import type { components } from "@/types/api";
import type {
  MaterialsQueryParams,
  AuditLogsQueryParams,
  MaterialAuditLogsQueryParams,
  ReviewCommentsQueryParams,
  UploadJobsQueryParams,
} from "@/types/materials";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Impersonation header name (must match backend)
const IMPERSONATE_HEADER = "X-Impersonate-User-Id";

// Module-level state for impersonation (set by ImpersonationContext)
let _impersonatedUserId: string | null = null;

/**
 * Set the user ID to impersonate. Called by ImpersonationContext.
 */
export function setImpersonatedUserId(userId: string | null): void {
  _impersonatedUserId = userId;
}

/**
 * Get the current impersonated user ID.
 */
export function getImpersonatedUserId(): string | null {
  return _impersonatedUserId;
}

// API response types - using OpenAPI generated types
type PaginatedMaterialsResponse =
  components["schemas"]["PaginatedMaterialsResponse"];
type MaterialWithReviews = components["schemas"]["MaterialWithReviews"];
type MaterialReviewCreate = components["schemas"]["MaterialReviewCreate"];
type MaterialReview = components["schemas"]["MaterialReview"];
type PaginatedAuditLogsResponse =
  components["schemas"]["PaginatedAuditLogsResponse"];
type PaginatedMaterialAuditLogsResponse =
  components["schemas"]["PaginatedMaterialAuditLogsResponse"];
export type UserResponse = components["schemas"]["UserResponse"];
type MaterialDataHistory = components["schemas"]["MaterialDataHistory"];

// Comment types (from OpenAPI)
export type ReviewComment = components["schemas"]["ReviewCommentResponse"];
export type ReviewCommentCreate = components["schemas"]["ReviewCommentCreate"];
export type PaginatedReviewCommentsResponse =
  components["schemas"]["PaginatedReviewCommentsResponse"];

// Upload job types (from OpenAPI)
export type UploadSAPDataResponse =
  components["schemas"]["UploadSAPDataResponse"];
export type UploadJobStatus = components["schemas"]["UploadJobStatus"];
export type UploadJobListResponse =
  components["schemas"]["UploadJobListResponse"];

// Review update type (from OpenAPI)
export type MaterialReviewUpdate =
  components["schemas"]["MaterialReviewUpdate"];

// Query param types are imported from @/types/materials
export type {
  MaterialsQueryParams,
  AuditLogsQueryParams,
  MaterialAuditLogsQueryParams,
  ReviewCommentsQueryParams,
  UploadJobsQueryParams,
} from "@/types/materials";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get the current session token from Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(_impersonatedUserId && { [IMPERSONATE_HEADER]: _impersonatedUserId }),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    // Handle unauthorized errors - user might need to re-authenticate
    if (response.status === 401) {
      throw new Error("Unauthorized - please log in again");
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(
        errorData.detail || `API request failed: ${response.statusText}`
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Materials API methods
  async getMaterials(
    params?: MaterialsQueryParams
  ): Promise<PaginatedMaterialsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params?.search) queryParams.append("search", params.search);

    // Filter parameters
    if (params?.material_type && params.material_type.length > 0) {
      params.material_type.forEach((type) =>
        queryParams.append("material_type", type)
      );
    }
    if (params?.min_total_value !== undefined)
      queryParams.append("min_total_value", params.min_total_value.toString());
    if (params?.max_total_value !== undefined)
      queryParams.append("max_total_value", params.max_total_value.toString());
    if (params?.min_total_quantity !== undefined)
      queryParams.append(
        "min_total_quantity",
        params.min_total_quantity.toString()
      );
    if (params?.max_total_quantity !== undefined)
      queryParams.append(
        "max_total_quantity",
        params.max_total_quantity.toString()
      );
    if (params?.last_reviewed_filter)
      queryParams.append("last_reviewed_filter", params.last_reviewed_filter);
    if (params?.next_review_filter)
      queryParams.append("next_review_filter", params.next_review_filter);
    if (params?.has_reviews !== undefined)
      queryParams.append("has_reviews", params.has_reviews.toString());
    if (params?.has_errors !== undefined)
      queryParams.append("has_errors", params.has_errors.toString());
    if (params?.has_warnings !== undefined)
      queryParams.append("has_warnings", params.has_warnings.toString());

    const queryString = queryParams.toString();
    const endpoint = `/materials${queryString ? `?${queryString}` : ""}`;

    return this.get<PaginatedMaterialsResponse>(endpoint);
  }

  async getMaterialDetails(
    materialNumber: number
  ): Promise<MaterialWithReviews | null> {
    return this.get<MaterialWithReviews | null>(`/materials/${materialNumber}`);
  }

  async createReview(
    materialNumber: number,
    data: MaterialReviewCreate
  ): Promise<MaterialReview> {
    return this.post<MaterialReview>(
      `/materials/${materialNumber}/review`,
      data
    );
  }

  async updateReview(
    materialNumber: number,
    reviewId: number,
    step: number,
    data: MaterialReviewUpdate
  ): Promise<MaterialReview> {
    // Map step number (0-4) to step enum string
    const stepNames = [
      "general_info",
      "checklist",
      "sme_investigation",
      "follow_up",
      "final_decision",
    ];
    const stepParam = stepNames[step];

    return this.put<MaterialReview>(
      `/materials/${materialNumber}/review/${reviewId}?step=${stepParam}`,
      data
    );
  }

  async cancelReview(
    materialNumber: number,
    reviewId: number
  ): Promise<{ message: string }> {
    return this.put<{ message: string }>(
      `/materials/${materialNumber}/review/${reviewId}/cancel`
    );
  }

  // Audit logs API methods
  async getAuditLogs(
    params?: AuditLogsQueryParams
  ): Promise<PaginatedAuditLogsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.table_name) queryParams.append("table_name", params.table_name);
    if (params?.record_id !== undefined)
      queryParams.append("record_id", params.record_id.toString());
    if (params?.operation) queryParams.append("operation", params.operation);
    if (params?.changed_by) queryParams.append("changed_by", params.changed_by);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);

    const queryString = queryParams.toString();
    const endpoint = `/audit-logs${queryString ? `?${queryString}` : ""}`;

    return this.get<PaginatedAuditLogsResponse>(endpoint);
  }

  async getMaterialAuditLogs(
    params?: MaterialAuditLogsQueryParams
  ): Promise<PaginatedMaterialAuditLogsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.material_number !== undefined)
      queryParams.append("material_number", params.material_number.toString());
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params?.changed_by_user_id)
      queryParams.append("changed_by_user_id", params.changed_by_user_id);

    const queryString = queryParams.toString();
    const endpoint = `/audit-logs/materials${
      queryString ? `?${queryString}` : ""
    }`;

    return this.get<PaginatedMaterialAuditLogsResponse>(endpoint);
  }

  // Upload SAP CSV data (returns job_id for progress polling)
  async uploadSAPData(file: File): Promise<UploadSAPDataResponse> {
    // Get the current session token from Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Create FormData and append the file
    const formData = new FormData();
    formData.append("csv_file", file);

    const url = `${this.baseUrl}/materials/upload-sap-data`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        // Don't set Content-Type - browser will set multipart/form-data with boundary
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(_impersonatedUserId && { [IMPERSONATE_HEADER]: _impersonatedUserId }),
      },
      body: formData,
    });

    // Handle unauthorized errors
    if (response.status === 401) {
      throw new Error("Unauthorized - please log in again");
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(
        errorData.detail || `Upload failed: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Get upload job status (for progress polling)
  async getUploadJobStatus(jobId: string): Promise<UploadJobStatus> {
    return this.get<UploadJobStatus>(`/materials/upload-jobs/${jobId}`);
  }

  // Get upload job history (paginated list of all upload jobs)
  async getUploadJobHistory(
    params?: UploadJobsQueryParams
  ): Promise<UploadJobListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("offset", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    const endpoint = `/materials/upload-jobs${queryString ? `?${queryString}` : ""}`;

    return this.get<UploadJobListResponse>(endpoint);
  }

  // Review comments API methods
  async getReviewComments(
    materialNumber: number,
    reviewId: number,
    params?: ReviewCommentsQueryParams
  ): Promise<PaginatedReviewCommentsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/materials/${materialNumber}/review/${reviewId}/comments${
      queryString ? `?${queryString}` : ""
    }`;

    return this.get<PaginatedReviewCommentsResponse>(endpoint);
  }

  async createReviewComment(
    materialNumber: number,
    reviewId: number,
    data: ReviewCommentCreate
  ): Promise<ReviewComment> {
    return this.post<ReviewComment>(
      `/materials/${materialNumber}/review/${reviewId}/comments`,
      data
    );
  }

  async deleteReviewComment(commentId: number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/comments/${commentId}`);
  }

  // User API methods
  async getCurrentUser(): Promise<UserResponse> {
    return this.get<UserResponse>("/users/me");
  }

  async updateProfile(data: {
    display_name?: string | null;
    phone?: string | null;
    notification_preferences?: { [key: string]: unknown } | null;
  }): Promise<UserResponse> {
    return this.put<UserResponse>("/users/me", data);
  }

  // Insight acknowledgement methods
  async acknowledgeInsight(
    materialNumber: number,
    insightId: number
  ): Promise<{ message: string }> {
    return this.put<{ message: string }>(
      `/materials/${materialNumber}/insights/${insightId}/acknowledge`
    );
  }

  async unacknowledgeInsight(
    materialNumber: number,
    insightId: number
  ): Promise<{ message: string }> {
    return this.put<{ message: string }>(
      `/materials/${materialNumber}/insights/${insightId}/unacknowledge`
    );
  }

  // Material history
  async getMaterialHistory(
    materialNumber: number
  ): Promise<MaterialDataHistory[]> {
    return this.get<MaterialDataHistory[]>(
      `/materials/${materialNumber}/history`
    );
  }

  // Dashboard summary
  async getDashboardSummary(): Promise<
    components["schemas"]["DashboardSummary"]
  > {
    return this.get<components["schemas"]["DashboardSummary"]>(`/dashboard`);
  }

  // Dashboard recent activity
  async getDashboardRecentActivity(): Promise<
    components["schemas"]["MaterialAuditLogEntry"][]
  > {
    return this.get<components["schemas"]["MaterialAuditLogEntry"][]>(
      `/dashboard/recent-activity`
    );
  }

  // Lookup options API methods
  async getLookupOptions(
    category?: string,
    includeInactive: boolean = false
  ): Promise<components["schemas"]["LookupOptionsGrouped"]> {
    const queryParams = new URLSearchParams();
    if (includeInactive) queryParams.append("include_inactive", "true");
    const queryString = queryParams.toString();

    if (category) {
      const endpoint = `/lookup-options/${category}${queryString ? `?${queryString}` : ""}`;
      return this.get<components["schemas"]["LookupOptionsGrouped"]>(endpoint);
    } else {
      // Returns all categories - for this we need a different return type
      // but for now, just return the first category or throw
      throw new Error("Category is required for getLookupOptions");
    }
  }

  async getAllLookupOptions(
    includeInactive: boolean = false
  ): Promise<Record<string, components["schemas"]["LookupOptionsGrouped"]>> {
    const queryParams = new URLSearchParams();
    if (includeInactive) queryParams.append("include_inactive", "true");
    const queryString = queryParams.toString();
    const endpoint = `/lookup-options${queryString ? `?${queryString}` : ""}`;
    return this.get<Record<string, components["schemas"]["LookupOptionsGrouped"]>>(endpoint);
  }

  async getLookupOptionDetail(
    optionId: number
  ): Promise<components["schemas"]["LookupOption"]> {
    return this.get<components["schemas"]["LookupOption"]>(
      `/lookup-options/detail/${optionId}`
    );
  }

  async getLookupOptionHistory(
    optionId: number
  ): Promise<components["schemas"]["LookupOptionHistory"][]> {
    return this.get<components["schemas"]["LookupOptionHistory"][]>(
      `/lookup-options/detail/${optionId}/history`
    );
  }

  async createLookupOption(
    data: components["schemas"]["LookupOptionCreate"]
  ): Promise<components["schemas"]["LookupOption"]> {
    return this.post<components["schemas"]["LookupOption"]>(
      `/lookup-options`,
      data
    );
  }

  async updateLookupOption(
    optionId: number,
    data: components["schemas"]["LookupOptionUpdate"]
  ): Promise<components["schemas"]["LookupOption"]> {
    return this.put<components["schemas"]["LookupOption"]>(
      `/lookup-options/${optionId}`,
      data
    );
  }

  async deleteLookupOption(optionId: number): Promise<void> {
    await this.delete<void>(`/lookup-options/${optionId}`);
  }

  // RBAC - Roles API methods (Read-only)
  async getRoles(params?: {
    includeInactive?: boolean;
    roleType?: string;
  }): Promise<components["schemas"]["RoleListItem"][]> {
    const queryParams = new URLSearchParams();
    if (params?.includeInactive) queryParams.append("include_inactive", "true");
    if (params?.roleType) queryParams.append("role_type", params.roleType);
    const queryString = queryParams.toString();
    return this.get<components["schemas"]["RoleListItem"][]>(
      `/roles${queryString ? `?${queryString}` : ""}`
    );
  }

  async getRole(roleId: number): Promise<components["schemas"]["RoleResponse"]> {
    return this.get<components["schemas"]["RoleResponse"]>(`/roles/${roleId}`);
  }

  // RBAC - User-Role Assignments API methods
  async getUserRoles(params?: {
    userId?: string;
    roleId?: number;
    includeInactive?: boolean;
  }): Promise<components["schemas"]["UserRoleResponse"][]> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append("user_id", params.userId);
    if (params?.roleId) queryParams.append("role_id", params.roleId.toString());
    if (params?.includeInactive) queryParams.append("include_inactive", "true");
    const queryString = queryParams.toString();
    return this.get<components["schemas"]["UserRoleResponse"][]>(
      `/user-roles${queryString ? `?${queryString}` : ""}`
    );
  }

  async createUserRole(
    data: components["schemas"]["UserRoleCreate"]
  ): Promise<components["schemas"]["UserRoleResponse"]> {
    return this.post<components["schemas"]["UserRoleResponse"]>(
      `/user-roles`,
      data
    );
  }

  async updateUserRole(
    userRoleId: number,
    data: components["schemas"]["UserRoleUpdate"]
  ): Promise<components["schemas"]["UserRoleResponse"]> {
    return this.put<components["schemas"]["UserRoleResponse"]>(
      `/user-roles/${userRoleId}`,
      data
    );
  }

  async deleteUserRole(userRoleId: number): Promise<void> {
    await this.delete<void>(`/user-roles/${userRoleId}`);
  }

  // RBAC - SME Expertise API methods
  async getSMEExpertise(params?: {
    userId?: string;
    smeType?: string;
    isAvailable?: boolean;
  }): Promise<components["schemas"]["SMEExpertiseResponse"][]> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append("user_id", params.userId);
    if (params?.smeType) queryParams.append("sme_type", params.smeType);
    if (params?.isAvailable !== undefined)
      queryParams.append("is_available", params.isAvailable.toString());
    const queryString = queryParams.toString();
    return this.get<components["schemas"]["SMEExpertiseResponse"][]>(
      `/sme-expertise${queryString ? `?${queryString}` : ""}`
    );
  }

  async createSMEExpertise(
    data: components["schemas"]["SMEExpertiseCreate"]
  ): Promise<components["schemas"]["SMEExpertiseResponse"]> {
    return this.post<components["schemas"]["SMEExpertiseResponse"]>(
      `/sme-expertise`,
      data
    );
  }

  async updateSMEExpertise(
    expertiseId: number,
    data: components["schemas"]["SMEExpertiseUpdate"]
  ): Promise<components["schemas"]["SMEExpertiseResponse"]> {
    return this.put<components["schemas"]["SMEExpertiseResponse"]>(
      `/sme-expertise/${expertiseId}`,
      data
    );
  }

  async deleteSMEExpertise(expertiseId: number): Promise<void> {
    await this.delete<void>(`/sme-expertise/${expertiseId}`);
  }

  // RBAC - Users list for picker
  async getUsers(params?: {
    search?: string;
    isActive?: boolean;
  }): Promise<components["schemas"]["UserListItem"][]> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.isActive !== undefined)
      queryParams.append("is_active", params.isActive.toString());
    const queryString = queryParams.toString();
    return this.get<components["schemas"]["UserListItem"][]>(
      `/users${queryString ? `?${queryString}` : ""}`
    );
  }

  // Notifications API methods
  async getNotifications(params?: {
    skip?: number;
    limit?: number;
    unread_only?: boolean;
  }): Promise<components["schemas"]["PaginatedNotificationsResponse"]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.unread_only !== undefined)
      queryParams.append("unread_only", params.unread_only.toString());

    const queryString = queryParams.toString();
    return this.get<components["schemas"]["PaginatedNotificationsResponse"]>(
      `/notifications${queryString ? `?${queryString}` : ""}`
    );
  }

  async getUnreadNotificationCount(): Promise<{ unread_count: number }> {
    return this.get<{ unread_count: number }>("/notifications/unread-count");
  }

  async markNotificationAsRead(
    notificationId: number
  ): Promise<{ message: string }> {
    return this.put<{ message: string }>(
      `/notifications/${notificationId}/read`
    );
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return this.put<{ message: string }>("/notifications/mark-all-read");
  }

  async getNotificationPreferences(): Promise<
    components["schemas"]["NotificationPreferences"]
  > {
    return this.get<components["schemas"]["NotificationPreferences"]>(
      "/notifications/preferences"
    );
  }

  async updateNotificationPreferences(data: {
    review_assigned?: boolean;
    review_status_changed?: boolean;
    comment_added?: boolean;
  }): Promise<components["schemas"]["NotificationPreferences"]> {
    return this.put<components["schemas"]["NotificationPreferences"]>(
      "/notifications/preferences",
      data
    );
  }

  // Debug: Create test notification (development only)
  async createDebugNotification(
    data: components["schemas"]["DebugNotificationCreate"]
  ): Promise<components["schemas"]["NotificationResponse"]> {
    return this.post<components["schemas"]["NotificationResponse"]>(
      "/notifications/debug/create",
      data
    );
  }
}

// Export a default instance
export const apiClient = new ApiClient();
