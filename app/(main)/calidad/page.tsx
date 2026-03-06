"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AsyncState } from "@/components/common/async-state"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { qualityApi } from "@/services/api"
import type { DailyConsistencyDTO } from "@/services/dto"
import { getLastClosedDate } from "@/lib/domain/closed-date"
import { formatEventDateTime } from "@/lib/ui/datetime"

export default function CalidadPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(getLastClosedDate())
  const [data, setData] = useState<DailyConsistencyDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConsistencyData = async () => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const consistency = await qualityApi.dailyConsistency(dateStr)
      setData(consistency)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadConsistencyData()
  }, [])

  const difference = Math.abs((data?.expectedTotal ?? 0) - (data?.actualTotal ?? 0))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calidad y consistencia</h1>
          <p className="text-sm text-muted-foreground">Validacion tecnica de datos procesados vs esperados.</p>
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
        <Button onClick={() => void loadConsistencyData()} disabled={loading}>Verificar</Button>
      </div>

      <AsyncState loading={loading} error={error} onRetry={() => void loadConsistencyData()} empty={!loading && !error && !data} />

      {data && !loading && !error && (
        <div className="space-y-4">
          <Card className={data.isConsistent ? "border-green-300" : "border-red-300"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {data.isConsistent ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                {data.isConsistent ? "Consistente" : "Inconsistente"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              <p>Expected total: <strong>{data.expectedTotal}</strong></p>
              <p>Actual total: <strong>{data.actualTotal}</strong></p>
              <p>Diferencia: <strong>{difference}</strong></p>
              <p>Last checked: <strong>{formatEventDateTime(data.lastChecked)}</strong></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Discrepancias
                <Badge variant={data.discrepancies && data.discrepancies.length > 0 ? "destructive" : "outline"}>
                  {data.discrepancies?.length ?? 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.discrepancies && data.discrepancies.length > 0 ? (
                data.discrepancies.map((item, index) => (
                  <div key={`${item.plate}-${index}`} className="rounded border p-2 text-sm">
                    <p className="font-mono">{item.plate}</p>
                    <p className="text-muted-foreground">Esperado: {item.expected} - Real: {item.actual}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin discrepancias.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
