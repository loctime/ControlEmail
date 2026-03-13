"use client"

import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyBreakdownPointDTO } from "@/services/api/dashboard/types"
import { formatDDMMYYYY } from "@/lib/domain/date"

export interface RiskTrendChartProps {
  /** Last 7 days breakdown (from week response) */
  dailyBreakdown: DailyBreakdownPointDTO[] | null
  /** When true, chart is hidden (e.g. preset is not week) */
  visible?: boolean
}

const chartConfig: ChartConfig = {
  totalExcessEvents: {
    label: "Excesos",
    color: "hsl(var(--chart-2))",
  },
  avgRisk: {
    label: "Riesgo promedio",
    color: "hsl(var(--chart-4))",
  },
}

export function RiskTrendChart({ dailyBreakdown, visible = true }: RiskTrendChartProps) {
  const data = useMemo(() => {
    if (!dailyBreakdown || dailyBreakdown.length === 0) return []
    return [...dailyBreakdown]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        dateLabel: formatDDMMYYYY(d.date).slice(0, 5),
      }))
  }, [dailyBreakdown])

  if (!visible || data.length === 0) {
    return null
  }

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-white/80">
          Tendencia de riesgo (últimos 7 días)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[220px] w-full"
          aria-label="Excesos y riesgo promedio por día"
        >
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="excess"
              tickLine={false}
              axisLine={false}
              width={34}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="risk"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={34}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => [value, undefined]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date ? formatDDMMYYYY(payload[0].payload.date) : ""
                  }
                />
              }
            />
            <Line
              yAxisId="excess"
              type="monotone"
              dataKey="totalExcessEvents"
              name="Excesos"
              stroke="var(--color-totalExcessEvents)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-totalExcessEvents)" }}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="risk"
              type="monotone"
              dataKey="avgRisk"
              name="Riesgo prom."
              stroke="var(--color-avgRisk)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: "var(--color-avgRisk)" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
