import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div ref={ref} data-chart={chartId} className={cn("flex aspect-video justify-center text-xs", className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme || c.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => {
            const vars = colorConfig
              .map(([key, itemConfig]) => {
                const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
                return color ? `  --color-${key}: ${color};` : null;
              })
              .filter(Boolean)
              .join("\n");
            return `${prefix} [data-chart=${id}] {\n${vars}\n}`;
          })
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      nameKey?: string;
      labelKey?: string;
    }
>(({ active, payload, className, hideLabel = false }, ref) => {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const first = payload[0];
  const firstKey = String(first?.dataKey || first?.name || "value");
  const label = hideLabel ? null : (config[firstKey]?.label ?? first?.name);

  return (
    <div ref={ref} className={cn("grid min-w-[8rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", className)}>
      {label ? <div className="font-medium">{label}</div> : null}
      <div className="grid gap-1">
        {payload.filter((item) => item.type !== "none").map((item) => {
          const key = String(item?.dataKey || item?.name || "value");
          const itemConfig = config[key];
          return (
            <div key={String(item.dataKey ?? key)} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
              <span className="font-mono font-medium tabular-nums text-foreground">{item.value as React.ReactNode}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div ref={ref} className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
      {payload.filter((item) => item.type !== "none").map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = config[key];
        return (
          <div key={String(item.value)} className="flex items-center gap-1.5">
            {!hideIcon ? <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} /> : null}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };

