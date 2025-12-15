import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartBarLabelProps {
  title: string;
  data: Record<string, string | number>[];
  config: ChartConfig;
  xAxisKey: string;
  dataKey: string;
  xAxisFormatter?: (value: string) => string;
  valueFormatter?: (value: number) => string;
  labelKey?: string;
  secondaryLabelKey?: string;
  secondaryFormatter?: (value: number) => string;
  colorKey?: string;
  colorFn?: (value: string) => string;
  loading?: boolean;
}

export function ChartBarLabel({
  title,
  data,
  config,
  xAxisKey,
  dataKey,
  xAxisFormatter = (value) => value,
  valueFormatter,
  labelKey,
  secondaryLabelKey,
  secondaryFormatter,
  colorKey,
  colorFn,
  loading,
}: ChartBarLabelProps) {
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="px-4">
          <Skeleton className="aspect-[3/1] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{title}</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="aspect-[3/1] flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <ChartContainer config={config} className="aspect-[3/1]">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={xAxisFormatter}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={8}>
              {colorKey && colorFn && data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colorFn(String(entry[colorKey]))} />
              ))}
              {secondaryLabelKey && (
                <LabelList
                  dataKey={secondaryLabelKey}
                  position="insideTop"
                  offset={4}
                  className="fill-background"
                  fontSize={10}
                  formatter={secondaryFormatter}
                />
              )}
              <LabelList
                dataKey={labelKey}
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={valueFormatter}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
