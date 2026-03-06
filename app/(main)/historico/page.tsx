"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AsyncState } from "@/components/common/async-state"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { qualityApi } from "@/services/api"
import type { DailyMetricsDTO } from "@/services/dto"
import { getLastClosedDate } from "@/lib/domain/closed-date"
import { formatEventDateTime } from "@/lib/ui/datetime"

export default function HistoricoPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(getLastClosedDate())
  const [data, setData] = useState<DailyMetricsDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistoricalData = async () => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const metrics = await qualityApi.dailyMetrics(dateStr)
      setData(metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistoricalData()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Historico de alertas</h1>
          <p className="text-sm text-muted-foreground">Consulta de cierres diarios y detalle por vehiculo.</p>
        </div>
        <LastClosedDateBadge />
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{format(selectedDate, "PPP", { locale: es })}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} disabled={{ after: getLastClosedDate() }} initialFocus />
          </PopoverContent>
        </Popover>
        <Button onClick={() => void loadHistoricalData()} disabled={loading}>Cargar</Button>
      </div>

      <AsyncState loading={loading} error={error} onRetry={() => void loadHistoricalData()} empty={!loading && !error && !data} />

      {data && !loading && !error && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resumen del dia</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Metric label="Total eventos" value={data.meta.totalEvents} />
              <Metric label="Total vehiculos" value={data.meta.totalVehicles} />
              <Metric label="Advertencias" value={data.meta.totalAdvertencias} />
              <Metric label="Criticos" value={data.meta.totalCriticos} />
              <Metric label="Vehiculos con criticos" value={data.meta.vehiclesWithCritical} />
              <Metric label="Generated at" value={data.meta.generatedAt ?? "-"} />
              <Metric label="Last updated" value={data.meta.lastUpdatedAt ?? "-"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detalle por vehiculo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Warning</TableHead>
                    <TableHead>No key</TableHead>
                    <TableHead>Excesos</TableHead>
                    <TableHead>Criticos</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Ultimo evento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.vehicles.map((vehicle) => (
                    <TableRow key={vehicle.plate}>
                      <TableCell className="font-mono">{vehicle.plate}</TableCell>
                      <TableCell>{vehicle.summary.totalEvents}</TableCell>
                      <TableCell>{vehicle.summary.warningEvents}</TableCell>
                      <TableCell>{vehicle.summary.noKeyEvents}</TableCell>
                      <TableCell>{vehicle.summary.excesos ?? 0}</TableCell>
                      <TableCell><Badge variant={vehicle.summary.criticalEvents > 0 ? "destructive" : "outline"}>{vehicle.summary.criticalEvents}</Badge></TableCell>
                      <TableCell>{vehicle.riskScore ?? 0}</TableCell>
                      <TableCell>{formatEventDateTime(vehicle.lastEventAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
