import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

/**
 * Numeric fields available for chart axes
 */
export const NUMERIC_FIELDS = [
  { value: "total_quantity", label: "Total Quantity" },
  { value: "total_value", label: "Total Value" },
  { value: "unit_value", label: "Unit Value" },
  { value: "opportunity_value_sum", label: "Opportunity Value" },
  { value: "safety_stock", label: "Safety Stock" },
  { value: "stock_safety_ratio", label: "Stock/Safety Ratio" },
  { value: "coverage_ratio", label: "Coverage Ratio" },
] as const;

/**
 * Color grouping options for chart
 */
export const COLOR_BY_OPTIONS = [
  { value: "material_type", label: "Material Type" },
  { value: "review_status", label: "Review Status" },
  { value: "insight_severity", label: "Insight Severity" },
] as const;

export type NumericField = (typeof NUMERIC_FIELDS)[number]["value"];
export type ColorByField = (typeof COLOR_BY_OPTIONS)[number]["value"];
export type ViewMode = "table" | "chart";

// Default values
const DEFAULT_VIEW: ViewMode = "table";
const DEFAULT_X_AXIS: NumericField = "total_quantity";
const DEFAULT_Y_AXIS: NumericField = "total_value";
const DEFAULT_COLOR_BY: ColorByField = "material_type";
const DEFAULT_SIZE_BY: NumericField = "coverage_ratio";

// Valid values for validation
const VALID_NUMERIC_FIELDS = NUMERIC_FIELDS.map((f) => f.value);
const VALID_COLOR_BY_FIELDS = COLOR_BY_OPTIONS.map((f) => f.value);

/**
 * Validate and return a numeric field, falling back to default if invalid
 */
function parseNumericField(
  value: string | null,
  defaultValue: NumericField
): NumericField {
  if (value && VALID_NUMERIC_FIELDS.includes(value as NumericField)) {
    return value as NumericField;
  }
  return defaultValue;
}

/**
 * Validate and return a color-by field, falling back to default if invalid
 */
function parseColorByField(value: string | null): ColorByField {
  if (value && VALID_COLOR_BY_FIELDS.includes(value as ColorByField)) {
    return value as ColorByField;
  }
  return DEFAULT_COLOR_BY;
}

/**
 * Hook to manage chart view state (view mode, axes, color, size) via URL search params
 * This enables shareable/bookmarkable chart configurations
 */
export function useChartUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params into typed state with validation
  const state = useMemo(() => {
    const viewParam = searchParams.get("view");
    const view: ViewMode =
      viewParam === "chart" ? "chart" : DEFAULT_VIEW;

    const xAxis = parseNumericField(searchParams.get("xAxis"), DEFAULT_X_AXIS);
    const yAxis = parseNumericField(searchParams.get("yAxis"), DEFAULT_Y_AXIS);
    const colorBy = parseColorByField(searchParams.get("colorBy"));
    const sizeBy = parseNumericField(searchParams.get("sizeBy"), DEFAULT_SIZE_BY);

    return { view, xAxis, yAxis, colorBy, sizeBy };
  }, [searchParams]);

  // Update URL params helper
  const updateParams = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === "") {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        });

        return newParams;
      });
    },
    [setSearchParams]
  );

  // View mode setter - clears chart params when switching to table
  const setView = useCallback(
    (view: ViewMode) => {
      if (view === "table") {
        // Clear all chart-specific params when switching to table
        updateParams({
          view: null,
          xAxis: null,
          yAxis: null,
          colorBy: null,
          sizeBy: null,
        });
      } else {
        updateParams({ view: "chart" });
      }
    },
    [updateParams]
  );

  // Axis setters - only set if non-default
  const setXAxis = useCallback(
    (xAxis: NumericField) => {
      updateParams({
        xAxis: xAxis === DEFAULT_X_AXIS ? null : xAxis,
      });
    },
    [updateParams]
  );

  const setYAxis = useCallback(
    (yAxis: NumericField) => {
      updateParams({
        yAxis: yAxis === DEFAULT_Y_AXIS ? null : yAxis,
      });
    },
    [updateParams]
  );

  const setColorBy = useCallback(
    (colorBy: ColorByField) => {
      updateParams({
        colorBy: colorBy === DEFAULT_COLOR_BY ? null : colorBy,
      });
    },
    [updateParams]
  );

  const setSizeBy = useCallback(
    (sizeBy: NumericField) => {
      updateParams({
        sizeBy: sizeBy === DEFAULT_SIZE_BY ? null : sizeBy,
      });
    },
    [updateParams]
  );

  return {
    // State
    view: state.view,
    xAxis: state.xAxis,
    yAxis: state.yAxis,
    colorBy: state.colorBy,
    sizeBy: state.sizeBy,

    // Setters
    setView,
    setXAxis,
    setYAxis,
    setColorBy,
    setSizeBy,
  };
}
