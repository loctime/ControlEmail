"use client"

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { TrendPoint } from "@/services/dashboard-api"

interface TrendChartProps {
  trend: TrendPoint[]
  loading?: boolean
}

const chartConfig: ChartConfig = {
  events: {
    label: "Eventos",
    color: "hsl(var(--chart-2))",
  },
}

export function TrendChart({ trend, loading = false }: TrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de eventos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <LineChart data={trend} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="events"
                stroke="var(--color-events)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
