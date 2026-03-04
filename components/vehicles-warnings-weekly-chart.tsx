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

interface WeeklyDataItem {
  patente: string
  advertencias: number
}

interface VehiclesWarningsWeeklyChartProps {
  data: WeeklyDataItem[]
}

export function VehiclesWarningsWeeklyChart({ data }: VehiclesWarningsWeeklyChartProps) {
  const hasData = Array.isArray(data) && data.length > 0

  return (
    <AppCard>
      <AppCardHeader className="pb-3">
        <AppCardTitle className="text-base font-medium">
          Vehículos – Cantidad de advertencias (semanal)
        </AppCardTitle>
      </AppCardHeader>
      <AppCardContent>
        {!hasData ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No hay advertencias esta semana
          </div>
        ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                horizontal={false}
              />
              <XAxis
                type="number"
                dataKey="advertencias"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={[0, (max: number) => Math.max(max, 10)]}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                tickFormatter={(v) => (v === 10 ? "+10" : String(v))}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="patente"
                width={70}
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
              <Bar
                dataKey="advertencias"
                name="Advertencias"
                fill="hsl(var(--chart-3))"
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </AppCardContent>
    </AppCard>
  )
}
