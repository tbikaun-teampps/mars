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

// Comment types
export interface ReviewComment {
  comment_id: number;
  review_id: number;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
  } | null;
}

export interface ReviewCommentCreate {
  comment: string;
}

export interface PaginatedReviewCommentsResponse {
  items: ReviewComment[];
  total: number;
  skip: number;
  limit: number;
}

// Type for SAP data upload response (async job)
export interface UploadSAPDataResponse {
  job_id: string;
  status: "pending";
  message: string;
}

// Type for upload job status polling
export interface UploadJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  current_phase: "validating" | "materials" | "insights" | "reviews" | null;
  progress: {
    total: number;
    processed: number;
    percentage: number;
  };
  file_name?: string | null;
  file_size_bytes?: number | null;
  file_mime_type?: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  result?: {
    inserted: number;
    updated: number;
    insights: number;
    reviews: number;
  };
  error?: string;
}

// Type for upload job history list response
export interface UploadJobListResponse {
  jobs: UploadJobStatus[];
  total: number;
}

// Type for updating a review (all fields optional for partial updates)
export interface MaterialReviewUpdate {
  review_reason?: string | null;
  current_stock_qty?: number | null;
  current_stock_value?: number | null;
  months_no_movement?: number | null;
  proposed_action?: string | null;
  proposed_safety_stock_qty?: number | null;
  proposed_unrestricted_qty?: number | null;
  business_justification?: string | null;
  // Checklist fields (Step 2)
  has_open_orders?: boolean;
  has_forecast_demand?: boolean;
  checked_alternate_plants?: boolean;
  contacted_procurement?: boolean;
  reviewed_bom_usage?: boolean;
  checked_supersession?: boolean;
  checked_historical_usage?: boolean;
  open_order_numbers?: string | null;
  forecast_next_12m?: number | null;
  alternate_plant_qty?: number | null;
  procurement_feedback?: string | null;
  // SME fields (Step 3)
  sme_name?: string | null;
  sme_email?: string | null;
  sme_department?: string | null;
  sme_feedback_method?: string | null;
  sme_contacted_date?: string | null;
  sme_responded_date?: string | null;
  sme_recommendation?: string | null;
  sme_recommended_safety_stock_qty?: number | null;
  sme_recommended_unrestricted_qty?: number | null;
  sme_analysis?: string | null;
  alternative_applications?: string | null;
  risk_assessment?: string | null;
  // Final decision fields (Step 5)
  final_decision?: string | null;
  final_safety_stock_qty?: number | null;
  final_unrestricted_qty?: number | null;
  final_notes?: string | null;
  decided_at?: string | null;
  // Follow-up fields (Step 4)
  requires_follow_up?: boolean | null;
  next_review_date?: string | null;
  follow_up_reason?: string | null;
  review_frequency_weeks?: number | null;
  previous_review_id?: number | null;
  estimated_savings?: number | null;
  implementation_date?: string | null;
  status?: string | null;
}

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
}

// Export a default instance
export const apiClient = new ApiClient();
