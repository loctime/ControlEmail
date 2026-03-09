"use client"

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

interface EventDistributionProps {
  distribution: EventDistribution
  loading?: boolean
}

const chartConfig: ChartConfig = {
  value: {
    label: "Eventos",
    color: "hsl(var(--chart-1))",
  },
}

function getData(distribution: EventDistribution) {
  return [
    { type: "excesos", value: distribution.excesos },
    { type: "no_identificados", value: distribution.no_identificados },
    { type: "contactos", value: distribution.contactos },
    { type: "llave_sin_cargar", value: distribution.llave_sin_cargar },
    { type: "conductor_inactivo", value: distribution.conductor_inactivo },
  ]
}

export function EventDistributionChart({ distribution, loading = false }: EventDistributionProps) {
  const data = getData(distribution)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribucion de eventos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="type"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={6} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
