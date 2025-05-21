export { Cell } from "recharts"
export { Legend } from "recharts"
export { Pie } from "recharts"
export { PieChart } from "recharts"
export { ResponsiveContainer } from "recharts"
export { Tooltip } from "recharts"
export { Bar } from "recharts"
export { CartesianGrid } from "recharts"
export { XAxis } from "recharts"
export { YAxis } from "recharts"
export { Area } from "recharts"
export { Line } from "recharts"
export { LineChart } from "recharts"
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  className?: string
}

export function AreaChart({ data = [], index, categories = [], colors = [], valueFormatter, className }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <XAxis dataKey={index} hide />
        <YAxis tickFormatter={valueFormatter} hide />
        <Tooltip formatter={(value: any) => (valueFormatter ? [valueFormatter(value), ""] : [value, ""])} />
        {categories.map((category, i) => (
          <Area
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

export function BarChart({ data = [], index, categories = [], colors = [], valueFormatter, className }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <XAxis dataKey={index} hide />
        <YAxis tickFormatter={valueFormatter} hide />
        <Tooltip formatter={(value: any) => (valueFormatter ? [valueFormatter(value), ""] : [value, ""])} />
        {categories.map((category, i) => (
          <Bar key={category} dataKey={category} fill={colors[i % colors.length]} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

interface DonutChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: number) => string
  className?: string
}

export function DonutChart({ data = [], index, categories = [], colors = [], valueFormatter, className }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsPieChart>
        <Pie dataKey="value" data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any) => (valueFormatter ? [valueFormatter(value), ""] : [value, ""])} />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

