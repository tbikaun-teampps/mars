/**
 * Material-related types derived from the OpenAPI spec
 */
import type { components, operations } from "./api";

/**
 * Converts `T | null` to `T | undefined` for each property.
 *
 * FastAPI generates OpenAPI schemas with `| null` for optional query parameters
 * (e.g., `sort_by?: string | null`) because Python's `Optional[T]` includes `None`.
 * However, in practice:
 * - The frontend uses `undefined` to omit parameters (standard JS/TS convention)
 * - You can't actually send `null` as a query param value in a URL
 *
 * This utility normalizes the generated types to match frontend usage patterns.
 */
type NullToUndefined<T> = {
  [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
};

// Raw query param types from OpenAPI (contain `| null`)
type RawMaterialsQueryParams = NonNullable<
  operations["list_materials_api_materials_get"]["parameters"]["query"]
>;
type RawAuditLogsQueryParams = NonNullable<
  operations["list_audit_logs_api_audit_logs_get"]["parameters"]["query"]
>;
type RawMaterialAuditLogsQueryParams = NonNullable<
  operations["list_material_audit_logs_api_audit_logs_materials_get"]["parameters"]["query"]
>;
type RawReviewCommentsQueryParams = NonNullable<
  operations["list_review_comments_api_materials__material_number__review__review_id__comments_get"]["parameters"]["query"]
>;
type RawUploadJobsQueryParams = NonNullable<
  operations["list_upload_jobs_api_materials_upload_jobs_get"]["parameters"]["query"]
>;

// Normalized query param types (null -> undefined)
export type MaterialsQueryParams = NullToUndefined<RawMaterialsQueryParams>;
export type AuditLogsQueryParams = NullToUndefined<RawAuditLogsQueryParams>;
export type MaterialAuditLogsQueryParams = NullToUndefined<RawMaterialAuditLogsQueryParams>;
export type ReviewCommentsQueryParams = NullToUndefined<RawReviewCommentsQueryParams>;

// Upload jobs query params (from OpenAPI, with skip alias for offset)
type BaseUploadJobsQueryParams = NullToUndefined<RawUploadJobsQueryParams>;
export interface UploadJobsQueryParams extends Omit<BaseUploadJobsQueryParams, "offset"> {
  // Frontend uses 'skip' which maps to 'offset' in the API
  skip?: number;
}

// Schema types (re-exported for convenience)
export type Material = components["schemas"]["Material"];
export type MaterialWithReviews = components["schemas"]["MaterialWithReviews"];
export type MaterialReview = components["schemas"]["MaterialReview"];
export type MaterialReviewCreate = components["schemas"]["MaterialReviewCreate"];
export type MaterialReviewUpdate = components["schemas"]["MaterialReviewUpdate"];
export type MaterialAuditLogEntry = components["schemas"]["MaterialAuditLogEntry"];
export type ReviewStatus = components["schemas"]["ReviewStatus"];
export type ReviewStepEnum = components["schemas"]["ReviewStepEnum"];
export type ReviewChecklist = components["schemas"]["ReviewChecklist"];
export type Insight = components["schemas"]["Insight"];
export type ConsumptionHistory = components["schemas"]["ConsumptionHistory"];