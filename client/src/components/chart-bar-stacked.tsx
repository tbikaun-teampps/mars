import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

interface ChartBarStackedProps {
  title: string;
  data: Record<string, string | number>[];
  config: ChartConfig;
  xAxisKey: string;
  xAxisFormatter?: (value: string) => string;
  stacked?: boolean;
}

export function ChartBarStacked({
  title,
  data,
  config,
  xAxisKey,
  xAxisFormatter = (value) => value,
  stacked = false,
}: ChartBarStackedProps) {
  const barKeys = Object.keys(config);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-[3/1]">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={xAxisFormatter}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            {barKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={stacked ? "a" : undefined}
                fill={`var(--color-${key})`}
                radius={
                  stacked
                    ? index === 0
                      ? [0, 0, 4, 4]
                      : index === barKeys.length - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    : 4
                }
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
