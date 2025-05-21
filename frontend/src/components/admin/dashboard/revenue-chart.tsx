import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";

// Interface for data passed as props
interface RevenueSummaryData {
  month: string; // e.g., "Jan 2025"
  [planKey: string]: number | string; // Allows for dynamic plan keys like "Free Plan", "Pro Plan", etc.
}

// Props interface for the component
interface RevenueChartProps {
  data: RevenueSummaryData[];
}

// Color mapping for known plans
const PLAN_COLORS: { [key: string]: string } = {
  "Free Plan": "#94a3b8",       // Slate
  "Pro Plan": "#8b5cf6",        // Purple
  "Organizer Plan": "#3b82f6",  // Blue
};

// Fallback colors for unknown plans
const FALLBACK_COLORS = ["#f59e0b", "#ef4444", "#6366f1"];

export function RevenueChart({ data }: RevenueChartProps) {
  // Dynamically identify plan keys present in the data
  const planKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(monthData => {
      Object.keys(monthData).forEach(key => {
        if (key !== 'month') {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground py-4">No revenue data available.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(value) => `$${value.toLocaleString()}`} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="font-medium">{label}</div>
                  {payload.map((entry, index) => {
                    const color = PLAN_COLORS[entry.dataKey?.toString() || ''] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                    return (
                      <div key={`item-${index}`} className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span>
                          {entry.name}: ${Number(entry.value).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            }
            return null
          }}
        />
        <Legend />
        {planKeys.map((planKey, index) => {
           const color = PLAN_COLORS[planKey] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
           return (
              <Bar 
                key={planKey} 
                dataKey={planKey} 
                stackId="a" 
                fill={color} 
                radius={[4, 4, 0, 0]} 
              />
            );
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}
