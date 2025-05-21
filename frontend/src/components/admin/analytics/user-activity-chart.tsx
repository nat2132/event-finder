import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Define props interface based on AnalyticsPage
interface ProcessedSignupData {
  date: string; // e.g., "YYYY-MM-DD"
  count: number;
}

interface UserActivityChartProps {
  data: ProcessedSignupData[];
}

export function UserActivityChart({ data }: UserActivityChartProps) {

  // Handle empty or undefined data prop
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground h-[200px] flex items-center justify-center">No user signup data available.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
         <defs>
           <linearGradient id="colorCountUAC" x1="0" y1="0" x2="0" y2="1">
             <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
             <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
           </linearGradient>
         </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          content={({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                  <p className="font-medium mb-1">{label}</p>
                  <p className="text-muted-foreground">
                     <span style={{ color: payload[0].color || '#8884d8' }}>●</span> {payload[0].value} New Signups
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorCountUAC)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
