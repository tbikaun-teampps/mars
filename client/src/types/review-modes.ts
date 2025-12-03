import type { LucideIcon } from "lucide-react";

export type ReviewMode =
  | "obsolescence"
  | "safety_stock"
  | "critical"
  | "stock_level";

export interface ReviewModeConfig {
  id: ReviewMode;
  label: string;
  icon: LucideIcon;
  color: {
    bg: string;
    border: string;
    text: string;
    progressActive: string;
    progressComplete: string;
  };
}
