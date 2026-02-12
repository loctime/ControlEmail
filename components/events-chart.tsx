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
  Legend,
} from "recharts"

interface ChartDataItem {
  hora: string
  excesos: number
  desvios: number
  otros: number
}

interface EventsChartProps {
  chartData: ChartDataItem[]
}

export function EventsChart({ chartData }: EventsChartProps) {
  return (
    <AppCard>
      <AppCardHeader className="pb-3">
        <AppCardTitle className="text-base font-medium">
          Eventos por hora - Hoy
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="hora"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
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
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                dataKey="excesos"
                name="Excesos"
                fill="hsl(var(--chart-4))"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="desvios"
                name="Desvios"
                fill="hsl(var(--chart-3))"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="otros"
                name="Otros"
                fill="hsl(var(--chart-1))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
