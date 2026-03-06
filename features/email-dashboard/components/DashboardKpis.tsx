"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Users, Activity } from "lucide-react"
import type { DailyMetricsDTO } from "@/services/api/quality/types"

interface DashboardKpisProps {
  data: DailyMetricsDTO | null
  loading: boolean
}

export function DashboardKpis({ data, loading }: DashboardKpisProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos disponibles para la fecha seleccionada
      </div>
    )
  }

  const { meta } = data

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{meta.totalEvents}</div>
          <p className="text-xs text-muted-foreground">
            Eventos del día
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vehículos Activos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{meta.totalVehicles}</div>
          <p className="text-xs text-muted-foreground">
            Con eventos hoy
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{meta.totalCriticos}</div>
          <p className="text-xs text-muted-foreground">
            Requieren atención
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vehículos con Críticos</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{meta.vehiclesWithCritical}</div>
          <p className="text-xs text-muted-foreground">
            {meta.totalVehicles > 0 ? Math.round((meta.vehiclesWithCritical / meta.totalVehicles) * 100) : 0}% del total
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface TopVehiclesProps {
  data: DailyMetricsDTO | null
  loading: boolean
}

export function TopVehicles({ data, loading }: TopVehiclesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Vehículos por Risk Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const topVehicles = [...data.vehicles]
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Vehículos por Risk Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topVehicles.map((vehicle, index) => (
            <div key={vehicle.plate} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                <span className="font-mono font-bold">{vehicle.plate}</span>
                {vehicle.alertSent && (
                  <Badge variant="secondary" className="text-xs">
                    Enviado
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">{vehicle.riskScore}</div>
                <div className="text-xs text-muted-foreground">
                  {vehicle.summary.criticalEvents} críticos
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

