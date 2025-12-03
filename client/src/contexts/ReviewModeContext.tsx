import * as React from "react";
import type { ReviewMode, ReviewModeConfig } from "@/types/review-modes";
import {
  REVIEW_MODE_CONFIGS,
  DEFAULT_REVIEW_MODE,
} from "@/lib/review-modes";

interface ReviewModeContextValue {
  selectedMode: ReviewMode;
  setSelectedMode: (mode: ReviewMode) => void;
  config: ReviewModeConfig;
}

const ReviewModeContext = React.createContext<
  ReviewModeContextValue | undefined
>(undefined);

export function useReviewMode() {
  const context = React.useContext(ReviewModeContext);
  if (!context) {
    throw new Error("useReviewMode must be used within ReviewModeProvider");
  }
  return context;
}

// Safe hook that returns undefined if not in context
export function useReviewModeOptional() {
  return React.useContext(ReviewModeContext);
}

interface ReviewModeProviderProps {
  children: React.ReactNode;
  initialMode?: ReviewMode;
}

export function ReviewModeProvider({
  children,
  initialMode = DEFAULT_REVIEW_MODE,
}: ReviewModeProviderProps) {
  const [selectedMode, setSelectedMode] =
    React.useState<ReviewMode>(initialMode);

  const config = REVIEW_MODE_CONFIGS[selectedMode];

  const value = React.useMemo(
    () => ({
      selectedMode,
      setSelectedMode,
      config,
    }),
    [selectedMode, config]
  );

  return (
    <ReviewModeContext.Provider value={value}>
      {children}
    </ReviewModeContext.Provider>
  );
}
