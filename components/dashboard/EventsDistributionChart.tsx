"use client"

import { memo, useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { EventDistribution } from "@/services/dashboard-api"

interface EventsDistributionChartProps {
  distribution: EventDistribution
  loading?: boolean
}

const chartConfig: ChartConfig = {
  value: {
    label: "Eventos",
    color: "hsl(var(--chart-1))",
  },
}

function EventsDistributionChartBase({ distribution, loading = false }: EventsDistributionChartProps) {
  const data = useMemo(
    () => [
      { type: "contactos", value: distribution.contactos },
      { type: "excesos", value: distribution.excesos },
      { type: "sin conductor", value: distribution.no_identificados },
      { type: "sin carga", value: distribution.llave_sin_cargar },
      { type: "otros", value: distribution.conductor_inactivo },
    ],
    [distribution],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribucion de eventos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[300px] w-full"
            aria-label="Grafico de barras de distribucion de eventos"
          >
            <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 20 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="type" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={6} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export const EventsDistributionChart = memo(EventsDistributionChartBase)

