"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useMemo } from "react"
import { format, subDays, startOfDay, parseISO } from "date-fns"
import type { VehicleEventDashboard } from "@/lib/firestore-read"

interface VehicleChartsProps {
  events: VehicleEventDashboard[]
  loading: boolean
}

export function VehicleCharts({ events, loading }: VehicleChartsProps) {
  // Datos para eventos por día (últimos 30 días)
  const dailyEventsData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i)
      return {
        fecha: format(date, "dd/MM"),
        fechaKey: format(date, "yyyy-MM-dd"),
        eventos: 0,
      }
    })

    const eventsByDate: Record<string, number> = {}
    events.forEach((event) => {
      try {
        const eventDate = parseISO(event.eventTimestamp)
        const dateKey = format(startOfDay(eventDate), "yyyy-MM-dd")
        eventsByDate[dateKey] = (eventsByDate[dateKey] || 0) + 1
      } catch {
        // Ignorar eventos con fecha inválida
      }
    })

    return days.map((day) => ({
      ...day,
      eventos: eventsByDate[day.fechaKey] || 0,
    }))
  }, [events])

  // Datos para distribución por severidad
  const severityData = useMemo(() => {
    const criticos = events.filter((e) => e.severity === "critico").length
    const advertencias = events.filter((e) => e.severity === "advertencia").length

    return [
      { name: "Críticos", value: criticos, color: "#ef4444" },
      { name: "Advertencias", value: advertencias, color: "#f97316" },
    ]
  }, [events])

  // Datos para tendencia mensual (últimos 6 meses)
  const monthlyData = useMemo(() => {
    const months: Record<string, { criticos: number; advertencias: number }> = {}
    
    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = format(date, "MMM yyyy")
      months[monthKey] = { criticos: 0, advertencias: 0 }
    }

    events.forEach((event) => {
      try {
        const eventDate = parseISO(event.eventTimestamp)
        const monthKey = format(eventDate, "MMM yyyy")
        if (months[monthKey]) {
          if (event.severity === "critico") {
            months[monthKey].criticos++
          } else {
            months[monthKey].advertencias++
          }
        }
      } catch {
        // Ignorar eventos con fecha inválida
      }
    })

    return Object.entries(months).map(([mes, datos]) => ({
      mes,
      ...datos,
    }))
  }, [events])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const COLORS = ["#ef4444", "#f97316"]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Eventos por día - últimos 30 días */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Eventos por Día (Últimos 30 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyEventsData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="eventos"
                  name="Eventos"
                  fill="hsl(var(--primary))"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribución por severidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Distribución por Severidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tendencia mensual */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Tendencia Mensual (Últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
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
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="criticos"
                  name="Críticos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="advertencias"
                  name="Advertencias"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
