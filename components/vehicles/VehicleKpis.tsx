"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, CheckCircle, Key, Clock, TrendingUp, AlertCircle } from "lucide-react"
import type { VehicleKpis } from "./useVehicleData"
import { format } from "date-fns"

interface VehicleKpisProps {
  kpis: VehicleKpis
  score: number
  loading: boolean
}

export function VehicleKpis({ kpis, score, loading }: VehicleKpisProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm")
    } catch {
      return dateString
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.totalEventos}</div>
          <p className="text-xs text-muted-foreground">En el período seleccionado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {kpis.totalCriticos}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpis.totalEventos > 0
              ? `${Math.round((kpis.totalCriticos / kpis.totalEventos) * 100)}% del total`
              : "Sin eventos"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Advertencias</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {kpis.totalAdvertencias}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpis.totalEventos > 0
              ? `${Math.round((kpis.totalAdvertencias / kpis.totalEventos) * 100)}% del total`
              : "Sin eventos"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sin Llave</CardTitle>
          <Key className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {kpis.totalSinLlave}
          </div>
          <p className="text-xs text-muted-foreground">Eventos sin llave</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Score de Riesgo</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{score}</div>
          <p className="text-xs text-muted-foreground">
            {(score <= 5 && "Bajo") || (score <= 15 && "Medio") || "Alto"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Último Evento</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {kpis.ultimoEvento ? (
            <>
              <div className="text-lg font-semibold">
                {formatDate(kpis.ultimoEvento.eventTimestamp)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.diasSinEventos === 0
                  ? "Hoy"
                  : kpis.diasSinEventos === 1
                    ? "Hace 1 día"
                    : `Hace ${kpis.diasSinEventos} días`}
              </p>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-muted-foreground">
                Sin eventos
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                No hay eventos registrados
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
