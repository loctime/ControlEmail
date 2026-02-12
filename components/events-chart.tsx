"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Eventos por hora - Hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
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
      </CardContent>
    </Card>
  )
}
