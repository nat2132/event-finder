import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

// Define the expected prop type
interface PlanData {
  name: string; // e.g., "Free Plan"
  value: number; // Count of users
}

interface PlanConversionChartProps {
  data: PlanData[];
}

// Define some default colors for the pie chart segments
const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

export function PlanConversionChart({ data }: PlanConversionChartProps) {

  // Handle empty or undefined data prop
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground h-[300px] flex items-center justify-center">No plan data available.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> // Cycle through defined colors
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
               const data = payload[0].payload
              // Find the color used for this segment for the tooltip indicator
              const entryIndex = payload[0]?.payload?.__index__; // Tremor might provide index
              const color = typeof entryIndex === 'number' ? COLORS[entryIndex % COLORS.length] : '#ccc'; 
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-medium">{data.name}</span>
                  </div>
                  <div className="mt-1 text-sm">{data.value.toLocaleString()} users</div>
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
