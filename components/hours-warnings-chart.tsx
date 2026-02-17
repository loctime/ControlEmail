"use client"

import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardContent,
} from "@/components/app-card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface HourDataItem {
  hora: string
  advertencias: number
}

interface HoursWarningsChartProps {
  data: HourDataItem[]
}

export function HoursWarningsChart({ data }: HoursWarningsChartProps) {
  return (
    <AppCard>
      <AppCardHeader className="pb-3">
        <AppCardTitle className="text-base font-medium">
          Horas con más advertencias
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="hora"
                tick={{ fontSize: 11 }}
                interval={1}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={[0, (max: number) => Math.max(max, 1)]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar
                dataKey="advertencias"
                name="Advertencias"
                fill="hsl(var(--chart-4))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
