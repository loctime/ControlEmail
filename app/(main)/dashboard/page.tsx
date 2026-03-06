"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AsyncState } from "@/components/common/async-state"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDashboardData } from "@/hooks/domain/useDashboardData"
import { dashboardApi } from "@/services/api"
import { queryKeys } from "@/lib/query/queryKeys"
import { getYesterdayKey, normalizeBusinessDate } from "@/lib/domain/date"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  const {
    data: lastDateData,
    isLoading: loadingLastDate,
    error: lastDateError,
  } = useQuery({
    queryKey: queryKeys.dashboard.lastDate(),
    queryFn: dashboardApi.myLastDateWithData,
    staleTime: 5 * 60_000,
  })

  // Inicializar fecha seleccionada con el último día con datos o, si falla, con el último cierre conocido (ayer).
  useEffect(() => {
    if (!selectedDate) {
      if (lastDateData?.date) {
        setSelectedDate(normalizeBusinessDate(lastDateData.date))
      } else if (lastDateError) {
        setSelectedDate(getYesterdayKey())
      }
    }
  }, [lastDateData, lastDateError, selectedDate])

  const {
    stats,
    riskVehicles,
    pendingAlerts,
    consistency,
    loading,
    error,
    refetch,
  } = useDashboardData(selectedDate)

  const maxAvailableDate = useMemo(() => {
    const base = lastDateData?.maxDate ?? lastDateData?.date
    return base ? normalizeBusinessDate(base) : undefined
  }, [lastDateData])

  const minAvailableDate = useMemo(() => {
    const base = lastDateData?.minDate
    return base ? normalizeBusinessDate(base) : undefined
  }, [lastDateData])

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "Seleccionar fecha"
    const d = new Date(`${selectedDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return selectedDate
    return format(d, "dd/MM/yyyy")
  }, [selectedDate])

  const hasData =
    (stats?.totalAlerts ?? 0) > 0 ||
    riskVehicles.length > 0 ||
    pendingAlerts.length > 0

  const selectedDateObj = selectedDate
    ? new Date(`${selectedDate}T00:00:00`)
    : undefined

  const maxDateObj = maxAvailableDate
    ? new Date(`${maxAvailableDate}T00:00:00`)
    : undefined

  const minDateObj = minAvailableDate
    ? new Date(`${minAvailableDate}T00:00:00`)
    : undefined

  const disabledDays: Matcher | undefined = maxDateObj ? { after: maxDateObj } : undefined

  const kpis = [
    { label: "Total alertas (ultimo cierre)", value: stats?.totalAlerts ?? 0 },
    { label: "Pendientes", value: stats?.alertsPending ?? 0 },
    { label: "Enviadas", value: stats?.alertsSent ?? 0 },
    { label: "Riesgo maximo", value: stats?.maxRisk ?? 0 },
    { label: "Riesgo promedio", value: stats?.avgRisk ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard profesional</h1>
          <p className="text-sm text-muted-foreground">
            Vista ejecutiva para HSE, operaciones y gerencia.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={loadingLastDate}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  locale={es}
                  selected={selectedDateObj}
                  onSelect={(d) => {
                    if (!d) return
                    setSelectedDate(normalizeBusinessDate(d))
                  }}
                  disabled={disabledDays}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">
              Fecha seleccionada: {selectedDateLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(normalizeBusinessDate(new Date()))}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(getYesterdayKey())}
            >
              Ayer
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loadingLastDate || !lastDateData?.date}
              onClick={() =>
                lastDateData?.date &&
                setSelectedDate(normalizeBusinessDate(lastDateData.date))
              }
            >
              Último con datos
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={
                  !selectedDate ||
                  !minAvailableDate ||
                  normalizeBusinessDate(selectedDate) <= minAvailableDate
                }
                onClick={() => {
                  if (!selectedDate) return
                  const d = new Date(`${selectedDate}T00:00:00`)
                  d.setDate(d.getDate() - 1)
                  setSelectedDate(normalizeBusinessDate(d))
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={
                  !selectedDate ||
                  !maxAvailableDate ||
                  normalizeBusinessDate(selectedDate) >= maxAvailableDate
                }
                onClick={() => {
                  if (!selectedDate) return
                  const d = new Date(`${selectedDate}T00:00:00`)
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(normalizeBusinessDate(d))
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={loading || !selectedDate}
            >
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <AsyncState loading={loading} error={error} onRetry={() => void refetch()} />

      {!loading && !error && !hasData && selectedDate && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            No existen alertas registradas para esta fecha ({selectedDateLabel}).
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vehiculos de mayor riesgo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {riskVehicles.slice(0, 10).map((item) => (
                  <div key={item.plate} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span className="font-mono">{item.plate}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Eventos: {item.alerts}</Badge>
                      <Badge>{item.maxRisk}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de calidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {consistency ? (
                  <>
                    <p>Expected total: <strong>{consistency.expectedTotal}</strong></p>
                    <p>Actual total: <strong>{consistency.actualTotal}</strong></p>
                    <p>
                      Estado: {consistency.isConsistent ? <Badge>Consistente</Badge> : <Badge variant="destructive">Inconsistente</Badge>}
                    </p>
                    <p>Ultima verificacion: {consistency.lastChecked ?? "Sin dato"}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Sin datos de consistencia</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tendencia 7/30/90</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              TODO tecnico: el backend actual no expone serie temporal consolidada en endpoints my-* para calcular tendencia global 7/30/90.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas pendientes ({pendingAlerts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pendingAlerts.slice(0, 8).map((alert) => (
                <div key={alert.alertId} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <p className="font-mono">{alert.plate}</p>
                    <p className="text-xs text-muted-foreground">Fecha cierre: {alert.dateKey}</p>
                  </div>
                  <Badge variant={alert.riskScore >= 15 ? "destructive" : "outline"}>Risk {alert.riskScore}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Link href="/historico"><Button variant="outline">Historico</Button></Link>
            <Link href="/pendientes"><Button variant="outline">Pendientes</Button></Link>
            <Link href="/vehiculos"><Button variant="outline">Vehiculos</Button></Link>
            <Link href="/configuracion"><Button variant="outline">Configuracion</Button></Link>
          </div>
        </>
      )}
    </div>
  )
}
