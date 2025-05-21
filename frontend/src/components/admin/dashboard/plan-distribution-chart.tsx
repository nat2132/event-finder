import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { useMemo } from "react";

// Interface for data passed as props
interface PlanDistributionData {
  name: string; // e.g., "Free Plan"
  value: number; // e.g., 100
}

// Props interface for the component
interface PlanDistributionChartProps {
  data: PlanDistributionData[];
}

// Color mapping for known plans
const PLAN_COLORS: { [key: string]: string } = {
  "Free Plan": "#94a3b8",       // Slate
  "Pro Plan": "#8b5cf6",        // Purple
  "Organizer Plan": "#3b82f6", // Blue
};
// Fallback colors for unknown plans or if more plans exist
const FALLBACK_COLORS = ["#f59e0b", "#10b981", "#ef4444", "#6366f1"];

export function PlanDistributionChart({ data }: PlanDistributionChartProps) {

  // Calculate total and assign colors dynamically
  const { chartData, totalValue } = useMemo(() => {
    let total = 0;
    let colorIndex = 0;
    const processedData = (data || []).map(entry => {
      total += entry.value;
      let color = PLAN_COLORS[entry.name];
      if (!color) {
        color = FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
        colorIndex++;
      }
      return { ...entry, color };
    });
    return { chartData: processedData, totalValue: total };
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return <div className="text-center text-muted-foreground py-4">No plan data available.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const entryData = payload[0].payload // Renamed for clarity
              const percentage = totalValue > 0 ? Math.round((entryData.value / totalValue) * 100) : 0;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entryData.color }} />
                    <span className="font-medium">{entryData.name}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    {entryData.value.toLocaleString()} users ({percentage}%)
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ paddingLeft: "10px" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
