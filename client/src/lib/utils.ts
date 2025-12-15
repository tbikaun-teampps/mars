import { components } from "@/types/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    case "completed":
      return "bg-green-500/10 border-green-500 text-green-500";
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
