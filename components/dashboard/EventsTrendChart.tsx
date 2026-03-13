"use client"

import { memo, useMemo } from "react"
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { TrendPoint } from "@/services/dashboard-api"

interface EventsTrendChartProps {
  trend: TrendPoint[]
  avgRisk: number
  loading?: boolean
}

const chartConfig: ChartConfig = {
  events: {
    label: "Eventos por dia",
    color: "hsl(var(--chart-2))",
  },
  avgRisk: {
    label: "Riesgo promedio",
    color: "hsl(var(--chart-4))",
  },
}

function getTodayKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(new Date())
}

function EventsTrendChartBase({ trend, avgRisk, loading = false }: EventsTrendChartProps) {
  const hasApiRisk = trend.some((point) => typeof (point as TrendPoint & { avgRisk?: number }).avgRisk === "number")

  const data = useMemo(() => {
    const todayKey = getTodayKey()
    const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date))

    if (sorted.length > 0 && sorted[sorted.length - 1]?.date === todayKey) {
      sorted.pop()
    }

    return sorted.map((point) => {
      const pointRisk = (point as TrendPoint & { avgRisk?: number }).avgRisk
      return {
        ...point,
        avgRisk: Number.isFinite(pointRisk) ? Number(pointRisk) : null,
      }
    })
  }, [trend])

  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader>
        <CardTitle>Tendencia temporal</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay dias completos para mostrar tendencia.</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="border border-border bg-muted text-foreground">
                Eventos por dia
              </Badge>
              {hasApiRisk && (
                <Badge variant="secondary" className="border border-red-500/20 bg-red-500/10 text-red-500">
                  Riesgo promedio backend
                </Badge>
              )}
            </div>
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full"
              aria-label="Grafico de tendencia temporal de eventos y riesgo promedio"
            >
              <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis yAxisId="events" tickLine={false} axisLine={false} width={34} />
                {hasApiRisk && <YAxis yAxisId="risk" orientation="right" tickLine={false} axisLine={false} width={34} />}
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Line
                  yAxisId="events"
                  type="monotone"
                  dataKey="events"
                  name="events"
                  stroke="var(--color-events)"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {hasApiRisk && (
                  <Line
                    yAxisId="risk"
                    type="monotone"
                    dataKey="avgRisk"
                    name="avgRisk"
                    stroke="var(--color-avgRisk)"
                    strokeWidth={2.2}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const EventsTrendChart = memo(EventsTrendChartBase)
