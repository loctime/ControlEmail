"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, CheckCircle, Key, Clock, TrendingUp, TrendingDown, AlertCircle, Award, Target } from "lucide-react"
import type { VehicleKpis, TrendData, RankingData } from "./useVehicleData"
import { cn } from "@/lib/utils"
import { formatEventDateTime } from "@/lib/ui/datetime"

interface VehicleKpisProps {
  kpis: VehicleKpis
  score: number
  trend: TrendData
  ranking: RankingData
  loading: boolean
}

export function VehicleKpis({ kpis, score, trend, ranking, loading }: VehicleKpisProps) {
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

  // Determinar color de tendencia
  const trendColor = trend.trendDirection === "down" 
    ? "text-green-600 dark:text-green-400" 
    : trend.trendDirection === "up"
    ? "text-red-600 dark:text-red-400"
    : "text-muted-foreground"

  const trendIcon = trend.trendDirection === "down" 
    ? TrendingDown 
    : trend.trendDirection === "up"
    ? TrendingUp
    : null

  // Determinar color de cumplimiento
  const cumplimientoColor = kpis.porcentajeSinLlave < 5
    ? "text-green-600 dark:text-green-400"
    : kpis.porcentajeSinLlave <= 15
    ? "text-orange-600 dark:text-orange-400"
    : "text-red-600 dark:text-red-400"

  const cumplimientoBg = kpis.porcentajeSinLlave < 5
    ? "bg-green-50 dark:bg-green-900/10"
    : kpis.porcentajeSinLlave <= 15
    ? "bg-orange-50 dark:bg-orange-900/10"
    : "bg-red-50 dark:bg-red-900/10"

  // Determinar color de días sin eventos
  const diasSinEventosBg = kpis.diasSinEventos > 30
    ? "bg-green-50 dark:bg-green-900/10"
    : kpis.diasSinEventos === 0
    ? "bg-red-50 dark:bg-red-900/10"
    : ""

  // Determinar si está en top 20% peor del ranking
  const isTop20PercentWorst = ranking.totalVehicles > 0 
    && ranking.position > Math.floor(ranking.totalVehicles * 0.8)

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
          {trendIcon && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
              <trendIcon className="h-3 w-3" />
              <span>
                {trend.trendPercentage > 0 ? "+" : ""}{trend.trendPercentage}% vs período anterior
              </span>
            </div>
          )}
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
                {formatEventDateTime(kpis.ultimoEvento.eventTimestamp)}
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

      {/* Ranking en Flota */}
      <Card className={cn(isTop20PercentWorst && "border-red-300 dark:border-red-800")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ranking en Flota</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {ranking.position > 0 ? `${ranking.position} / ${ranking.totalVehicles}` : "-"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {ranking.position > 0 
              ? `Más eventos = peor posición`
              : "Sin datos de ranking"}
          </p>
          {isTop20PercentWorst && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
              Top 20% con más eventos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Indicador de Cumplimiento */}
      <Card className={cn(cumplimientoBg)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Eventos sin identificación</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", cumplimientoColor)}>
            {kpis.porcentajeSinLlave}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.totalSinLlave} de {kpis.totalEventos} eventos
          </p>
        </CardContent>
      </Card>

      {/* Días Sin Eventos */}
      <Card className={cn(diasSinEventosBg)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Días Sin Eventos</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {kpis.diasSinEventos}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.diasSinEventos === 0
              ? "Eventos hoy"
              : kpis.diasSinEventos === 1
                ? "día sin eventos"
                : "días sin eventos"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
