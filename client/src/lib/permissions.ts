import type { components } from "@/types/api";

type RoleResponse = components["schemas"]["RoleResponse"];

/**
 * Extract keys that start with "can_" from RoleResponse.
 * This type is derived from the backend schema.
 */
export type Permission = Extract<keyof RoleResponse, `can_${string}`>;

/**
 * Runtime list of all permissions (for iteration).
 * TypeScript ensures this stays in sync with backend - errors if missing.
 */
export const ALL_PERMISSIONS: Permission[] = [
  "can_create_reviews",
  "can_edit_reviews",
  "can_delete_reviews",
  "can_approve_reviews",
  "can_provide_sme_review",
  "can_assign_reviews",
  "can_manage_users",
  "can_manage_settings",
  "can_view_all_reviews",
  "can_export_data",
  "can_manage_acknowledgements",
  "can_upload_data",
];

/**
 * Human-readable labels for permissions.
 * TypeScript ensures all permissions have labels.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  can_create_reviews: "Create Reviews",
  can_edit_reviews: "Edit Reviews",
  can_delete_reviews: "Delete Reviews",
  can_approve_reviews: "Approve Reviews",
  can_provide_sme_review: "Provide SME Review",
  can_assign_reviews: "Assign Reviews",
  can_manage_users: "Manage Users",
  can_manage_settings: "Manage Settings",
  can_view_all_reviews: "View All Reviews",
  can_export_data: "Export Data",
  can_manage_acknowledgements: "Manage Acknowledgements",
  can_upload_data: "Upload Data",
};
