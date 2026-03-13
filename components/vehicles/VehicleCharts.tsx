"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DailyAlertVehicle } from "@/lib/firestore-read"

interface VehicleChartsProps {
  totalEventsCount: number
  storedEventsCount: number
  eventsTruncated: boolean
  speedIncidents: DailyAlertVehicle["speedIncidents"]
  summary: DailyAlertVehicle["summary"]
  loading: boolean
}

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]

export function VehicleCharts({
  totalEventsCount,
  storedEventsCount,
  eventsTruncated,
  speedIncidents,
  summary,
  loading,
}: VehicleChartsProps) {
  const summaryData = useMemo(
    () => [
      { name: "Excesos", value: summary.excesos ?? 0 },
      { name: "No identificados", value: summary.no_identificados ?? 0 },
      { name: "Contactos", value: summary.contactos ?? 0 },
      { name: "Sin llave", value: summary.llave_sin_cargar ?? 0 },
      { name: "Conductor inactivo", value: summary.conductor_inactivo ?? 0 },
    ].filter((item) => item.value > 0),
    [summary],
  )

  const speedData = useMemo(
    () =>
      speedIncidents
        .slice()
        .sort((a, b) => (b.maxSpeed ?? 0) - (a.maxSpeed ?? 0))
        .slice(0, 6)
        .map((incident, index) => ({
          name: incident.location || `Incidente ${index + 1}`,
          velocidad: incident.maxSpeed ?? 0,
        })),
    [speedIncidents],
  )

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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Totales del cierre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Total backend</p>
            <p className="text-3xl font-bold">{totalEventsCount}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Eventos almacenados</p>
              <p className="text-2xl font-semibold">{storedEventsCount}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Incidentes de velocidad</p>
              <p className="text-2xl font-semibold">{speedIncidents.length}</p>
            </div>
          </div>
          {eventsTruncated && (
            <p className="text-sm text-muted-foreground">
              Showing partial events ({storedEventsCount} stored of {totalEventsCount} total)
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Distribucion por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            {summaryData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No hay distribucion disponible.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summaryData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {summaryData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-medium">Velocidad maxima por incidente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            {speedData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No hay incidentes de velocidad agrupados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speedData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="velocidad" name="Velocidad maxima" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
