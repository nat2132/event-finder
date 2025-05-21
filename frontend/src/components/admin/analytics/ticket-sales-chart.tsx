import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Define props interface based on AnalyticsPage
interface RevenueDataEntry {
  month: string;
  // Allow dynamic keys for different revenue sources (e.g., 'Event Ticket')
  [key: string]: number | string;
}

interface TicketSalesChartProps {
  data: RevenueDataEntry[];
}

export function TicketSalesChart({ data }: TicketSalesChartProps) {

  // Handle empty or undefined data prop
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground h-[200px] flex items-center justify-center">No revenue data available.</div>;
  }

  // Process data to sum relevant revenue types per month if needed,
  // or define categories based on keys present (e.g., ['Event Ticket', 'Pro Plan'])
  // For simplicity, let's try showing total revenue from all sources first.

  const processedData = data.map(entry => {
    let totalRevenue = 0;
    // Sum up all numeric values except potentially an 'id' or similar non-revenue key
    Object.keys(entry).forEach(key => {
      if (key !== 'month' && typeof entry[key] === 'number') {
        totalRevenue += entry[key] as number;
      }
    });
    return {
      month: entry.month,
      "Total Revenue": totalRevenue // Use a generic category name
    };
  });

  const revenueCategories = ["Total Revenue"]; // Define the category

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={processedData}
        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="month"
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
          tickFormatter={(value) => `ETB ${value / 1000}k`} // Format ticks as thousands
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          content={({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                  <p className="font-medium mb-1">{label}</p>
                  {payload.map((item: any, index: number) => (
                    <p key={index} className="text-muted-foreground">
                      <span style={{ color: item.color || '#8884d8' }}>●</span> {item.name}: ETB {item.value.toLocaleString()}
                    </p>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        {/* <Legend /> */ /* Optionally add Legend */}
        <Bar dataKey="Total Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
