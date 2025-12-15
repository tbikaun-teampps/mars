import { Archive, Shield, AlertTriangle, BarChart2 } from "lucide-react";
import type { ReviewMode, ReviewModeConfig } from "@/types/review-modes";

export const REVIEW_MODE_CONFIGS: Record<ReviewMode, ReviewModeConfig> = {
  obsolescence: {
    id: "obsolescence",
    label: "Obsolescence Review",
    icon: Archive,
    color: {
      bg: "bg-amber-50",
      border: "border-amber-500",
      text: "text-amber-600",
      progressActive: "border-amber-600 bg-amber-600",
      progressComplete: "border-amber-600 bg-amber-600",
    },
  },
  safety_stock: {
    id: "safety_stock",
    label: "Safety Stock Review",
    icon: Shield,
    color: {
      bg: "bg-blue-50",
      border: "border-blue-500",
      text: "text-blue-600",
      progressActive: "border-blue-600 bg-blue-600",
      progressComplete: "border-blue-600 bg-blue-600",
    },
  },
  critical: {
    id: "critical",
    label: "Critical Review",
    icon: AlertTriangle,
    color: {
      bg: "bg-red-50",
      border: "border-red-500",
      text: "text-red-600",
      progressActive: "border-red-600 bg-red-600",
      progressComplete: "border-red-600 bg-red-600",
    },
  },
  stock_level: {
    id: "stock_level",
    label: "Stock Level Review",
    icon: BarChart2,
    color: {
      bg: "bg-green-50",
      border: "border-green-500",
      text: "text-green-600",
      progressActive: "border-green-600 bg-green-600",
      progressComplete: "border-green-600 bg-green-600",
    },
  },
};

export const DEFAULT_REVIEW_MODE: ReviewMode = "stock_level";

export const REVIEW_MODES: ReviewMode[] = [
  "obsolescence",
  "safety_stock",
  "critical",
  "stock_level",
];
