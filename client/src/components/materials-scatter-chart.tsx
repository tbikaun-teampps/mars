import * as React from "react";
import Plot from "react-plotly.js";
import { components } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { MaterialDetailSheet } from "@/components/material-detail-sheet";
import { useMaterials } from "@/api/queries";
import { useTableUrlState } from "@/hooks/useTableUrlState";
import {
  useChartUrlState,
  NUMERIC_FIELDS,
  COLOR_BY_OPTIONS,
  type NumericField,
  type ColorByField,
} from "@/hooks/useChartUrlState";

type Material = components["schemas"]["Material"];

// Material type colors (matching materials-table.tsx)
const MATERIAL_TYPE_COLORS: Record<string, string> = {
  CHEM: "#ef4444", // red
  CORE: "#6366f1", // indigo
  FING: "#22c55e", // green
  OPER: "#f97316", // orange
  RAWM: "#eab308", // yellow
  ROTG: "#14b8a6", // teal
  SPRS: "#3b82f6", // blue
  OTHER: "#6b7280", // gray
};

// Review status colors
const REVIEW_STATUS_COLORS: Record<string, string> = {
  "In Review": "#3b82f6", // blue
  Overdue: "#ef4444", // red
  "Due Soon": "#eab308", // yellow
  OK: "#22c55e", // green
  "Not Reviewed": "#6b7280", // gray
};

// Insight severity colors
const INSIGHT_SEVERITY_COLORS: Record<string, string> = {
  Error: "#ef4444", // red
  Warning: "#eab308", // yellow
  None: "#22c55e", // green
};

function getNumericValue(material: Material, field: NumericField): number {
  const value = material[field as keyof Material];
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value === "number") return value;
  return 0;
}

function getReviewStatus(material: Material): string {
  if (material.has_active_review) return "In Review";
  if (!material.last_reviewed) return "Not Reviewed";

  const nextReview = material.next_review;
  if (nextReview) {
    const nextDate = new Date(nextReview);
    const now = new Date();
    const diffDays = (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 0) return "Overdue";
    if (diffDays < 30) return "Due Soon";
  }
  return "OK";
}

function getInsightSeverity(material: Material): string {
  const insights = material.insights || [];
  if (insights.some((i) => i.insight_type === "error")) return "Error";
  if (insights.some((i) => i.insight_type === "warning")) return "Warning";
  return "None";
}

function getColorGroup(material: Material, colorBy: ColorByField): string {
  switch (colorBy) {
    case "material_type":
      return material.material_type || "OTHER";
    case "review_status":
      return getReviewStatus(material);
    case "insight_severity":
      return getInsightSeverity(material);
    default:
      return "OTHER";
  }
}

function getColorForGroup(colorBy: ColorByField, group: string): string {
  switch (colorBy) {
    case "material_type":
      return MATERIAL_TYPE_COLORS[group] || MATERIAL_TYPE_COLORS.OTHER;
    case "review_status":
      return REVIEW_STATUS_COLORS[group] || REVIEW_STATUS_COLORS["Not Reviewed"];
    case "insight_severity":
      return INSIGHT_SEVERITY_COLORS[group] || INSIGHT_SEVERITY_COLORS.None;
    default:
      return "#6b7280";
  }
}

function getFieldLabel(field: NumericField): string {
  return NUMERIC_FIELDS.find((f) => f.value === field)?.label || field;
}

// No limit for the chart - WebGL can handle large datasets
const MAX_MATERIALS = 50000;

// Loading stages for the chart
const LOADING_STAGES = [
  { label: "Fetching materials data", duration: 800 },
  { label: "Processing data points", duration: 600 },
  { label: "Calculating dimensions", duration: 400 },
  { label: "Rendering chart", duration: 500 },
] as const;

function ChartLoadingState() {
  const [currentStage, setCurrentStage] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const totalDuration = LOADING_STAGES.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      setProgress(newProgress);

      // Calculate which stage we're in
      let accumulatedTime = 0;
      for (let i = 0; i < LOADING_STAGES.length; i++) {
        accumulatedTime += LOADING_STAGES[i].duration;
        if (elapsed < accumulatedTime) {
          setCurrentStage(i);
          break;
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center h-[500px] gap-6">
        <div className="w-full max-w-md space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="space-y-2 overflow-hidden">
            {LOADING_STAGES.map((stage, index) => (
              <div
                key={stage.label}
                className="flex items-center gap-3 transition-all duration-300 ease-out"
                style={{
                  transform: `translateX(${index < currentStage ? -20 : index === currentStage ? 0 : 40}px)`,
                  opacity: index < currentStage ? 0.4 : index === currentStage ? 1 : 0.2,
                }}
              >
                <div
                  className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                    index < currentStage
                      ? "bg-green-500"
                      : index === currentStage
                        ? "bg-primary animate-pulse"
                        : "bg-muted"
                  }`}
                />
                <span
                  className={`text-sm transition-colors duration-300 ${
                    index === currentStage
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MaterialsScatterChart() {
  // Chart configuration state from URL
  const {
    xAxis,
    yAxis,
    colorBy,
    sizeBy,
    setXAxis,
    setYAxis,
    setColorBy,
    setSizeBy,
  } = useChartUrlState();

  // Material detail sheet state
  const [selectedMaterialNumber, setSelectedMaterialNumber] = React.useState<
    number | null
  >(null);
  const [selectedMaterialDescription, setSelectedMaterialDescription] =
    React.useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  // Get filters from URL state (shared with table)
  const { sorting, filters } = useTableUrlState();

  // Build query params
  const sortBy = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  // Fetch materials with current filters
  const { data, isLoading, isError, error } = useMaterials({
    skip: 0,
    limit: MAX_MATERIALS,
    sort_by: sortBy,
    sort_order: sortOrder,
    material_type:
      filters.materialType.length > 0 ? filters.materialType : undefined,
    min_total_value: filters.minTotalValue,
    max_total_value: filters.maxTotalValue,
    min_total_quantity: filters.minTotalQuantity,
    max_total_quantity: filters.maxTotalQuantity,
    last_reviewed_filter: filters.lastReviewedFilter,
    next_review_filter: filters.nextReviewFilter,
    has_reviews: filters.hasReviews,
    has_errors: filters.hasErrors,
    has_warnings: filters.hasWarnings,
    search: filters.search,
  });

  const materials = data?.items ?? [];
  const total = data?.total ?? 0;

  // Group materials by color category for separate traces
  const groupedData = React.useMemo(() => {
    const groups = new Map<string, Material[]>();
    materials.forEach((m) => {
      const group = getColorGroup(m, colorBy);
      const existing = groups.get(group) || [];
      existing.push(m);
      groups.set(group, existing);
    });
    return groups;
  }, [materials, colorBy]);

  // Calculate size range for normalization
  const sizeRange = React.useMemo(() => {
    if (materials.length === 0) return { min: 0, max: 1 };
    const sizes = materials.map((m) => getNumericValue(m, sizeBy));
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    return { min, max: max === min ? min + 1 : max };
  }, [materials, sizeBy]);

  // Normalize size to a reasonable marker size range (5-30)
  const normalizeSize = (value: number): number => {
    const normalized = (value - sizeRange.min) / (sizeRange.max - sizeRange.min);
    return 5 + normalized * 25;
  };

  // Build Plotly traces (one per color group)
  const traces = React.useMemo(() => {
    return Array.from(groupedData.entries()).map(([group, items]) => ({
      type: "scattergl" as const,
      mode: "markers" as const,
      name: group,
      x: items.map((m) => getNumericValue(m, xAxis)),
      y: items.map((m) => getNumericValue(m, yAxis)),
      text: items.map(
        (m) =>
          `<b>${m.material_desc}</b><br>` +
          `#${m.material_number} | ${m.material_type}<br>` +
          `${getFieldLabel(xAxis)}: ${getNumericValue(m, xAxis).toLocaleString()}<br>` +
          `${getFieldLabel(yAxis)}: ${getNumericValue(m, yAxis).toLocaleString()}<br>` +
          `${getFieldLabel(sizeBy)}: ${getNumericValue(m, sizeBy).toLocaleString()}`
      ),
      hoverinfo: "text" as const,
      marker: {
        size: items.map((m) => normalizeSize(getNumericValue(m, sizeBy))),
        color: getColorForGroup(colorBy, group),
        opacity: 0.7,
        line: {
          color: "white",
          width: 1,
        },
      },
    }));
  }, [groupedData, xAxis, yAxis, sizeBy, colorBy, sizeRange]);

  // Plotly layout configuration
  const layout = React.useMemo(
    () => ({
      autosize: true,
      height: 500,
      margin: { l: 60, r: 30, t: 30, b: 60 },
      xaxis: {
        title: { text: getFieldLabel(xAxis) },
        gridcolor: "rgba(128, 128, 128, 0.2)",
        zerolinecolor: "rgba(128, 128, 128, 0.3)",
      },
      yaxis: {
        title: { text: getFieldLabel(yAxis) },
        gridcolor: "rgba(128, 128, 128, 0.2)",
        zerolinecolor: "rgba(128, 128, 128, 0.3)",
      },
      legend: {
        orientation: "h" as const,
        yanchor: "bottom" as const,
        y: 1.02,
        xanchor: "center" as const,
        x: 0.5,
      },
      hovermode: "closest" as const,
      dragmode: "zoom" as const,
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: {
        family: "inherit",
        color: "hsl(var(--foreground))",
      },
    }),
    [xAxis, yAxis]
  );

  // Plotly config
  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      "select2d",
      "lasso2d",
      "autoScale2d",
      "hoverClosestCartesian",
      "hoverCompareCartesian",
      "toggleSpikelines",
    ],
    responsive: true,
    scrollZoom: true,
  };

  // Store material data for click lookup (indexed by point index per trace)
  const materialLookup = React.useMemo(() => {
    const lookup: Material[][] = [];
    Array.from(groupedData.entries()).forEach(([, items]) => {
      lookup.push(items);
    });
    return lookup;
  }, [groupedData]);

  // Handle point click
  const handleClick = (event: Plotly.PlotMouseEvent) => {
    if (event.points && event.points.length > 0) {
      const point = event.points[0];
      const traceIndex = point.curveNumber;
      const pointIndex = point.pointIndex;
      const material = materialLookup[traceIndex]?.[pointIndex];
      if (material) {
        setSelectedMaterialNumber(material.material_number);
        setSelectedMaterialDescription(material.material_desc);
        setIsSheetOpen(true);
      }
    }
  };

  if (isLoading) {
    return <ChartLoadingState />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="text-destructive">
            Error: {error?.message ?? "Failed to load chart data"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">X-Axis:</span>
                <Select value={xAxis} onValueChange={(v) => setXAxis(v as NumericField)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMERIC_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Y-Axis:</span>
                <Select value={yAxis} onValueChange={(v) => setYAxis(v as NumericField)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMERIC_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Color:</span>
                <Select value={colorBy} onValueChange={(v) => setColorBy(v as ColorByField)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_BY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Size:</span>
                <Select value={sizeBy} onValueChange={(v) => setSizeBy(v as NumericField)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMERIC_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Badge variant="secondary">
              {materials.length.toLocaleString()} materials
            </Badge>
          </div>
        </CardHeader>

        {total > MAX_MATERIALS && (
          <div className="px-6 pb-2">
            <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Showing {MAX_MATERIALS.toLocaleString()} of {total.toLocaleString()} materials.
                Apply filters to see more specific data.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <CardContent>
          <Plot
            data={traces as Plotly.Data[]}
            layout={layout}
            config={config}
            onClick={handleClick}
            style={{ width: "100%", height: "500px" }}
            useResizeHandler={true}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Scroll to zoom, drag to pan, double-click to reset. Click a point to view details.
          </p>
        </CardContent>
      </Card>

      <MaterialDetailSheet
        materialNumber={selectedMaterialNumber}
        materialDescription={selectedMaterialDescription}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  );
}