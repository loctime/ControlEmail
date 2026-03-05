"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { emailModuleService } from "@/services/emailModule"
import type { DailyConsistencyDTO } from "@/services/dto"
import { formatEventDateTime } from "@/lib/ui/datetime"

export default function CalidadPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [data, setData] = useState<DailyConsistencyDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConsistencyData = async () => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const consistency = await emailModuleService.getDailyConsistency(dateStr)
      setData(consistency)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    loadConsistencyData()
  })

  const getConsistencyStatus = (isConsistent: boolean) => {
    if (isConsistent) {
      return {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        borderColor: "border-green-300",
        label: "CONSISTENTE"
      }
    } else {
      return {
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        borderColor: "border-red-300",
        label: "INCONSISTENTE"
      }
    }
  }

  const consistencyStatus = data ? getConsistencyStatus(data.isConsistent) : null
  const StatusIcon = consistencyStatus?.icon || CheckCircle

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calidad de Datos</h1>
          <p className="text-muted-foreground">
            Verificación de consistencia entre eventos procesados y alertas generadas
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={loadConsistencyData} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Verificar
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-64 bg-muted rounded"></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="space-y-6">
          {/* Estado general de consistencia */}
          <Card className={cn("overflow-hidden", consistencyStatus?.borderColor)}>
            <div className={cn(
              "w-full px-6 py-4 border-b",
              consistencyStatus?.bgColor
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon className={cn("h-8 w-8", consistencyStatus?.color)} />
                  <div>
                    <h2 className={cn("text-xl font-bold", consistencyStatus?.color)}>
                      {consistencyStatus?.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Verificación del {format(selectedDate, "PPP", { locale: es })}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn("text-lg px-4 py-2", consistencyStatus?.bgColor, consistencyStatus?.color)}
                >
                  {data.isConsistent ? "✓" : "✗"}
                </Badge>
              </div>
            </div>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-semibold">Totales Esperados</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eventos totales:</span>
                      <span className="font-bold">{data.expectedTotal}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Totales Reales</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Eventos procesados:</span>
                      <span className="font-bold">{data.actualTotal}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Diferencia */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Diferencia:</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-bold text-lg",
                      Math.abs(data.expectedTotal - data.actualTotal) === 0 
                        ? "text-green-600" 
                        : "text-red-600"
                    )}>
                      {Math.abs(data.expectedTotal - data.actualTotal)}
                    </span>
                    {Math.abs(data.expectedTotal - data.actualTotal) > 0 && (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
                {data.expectedTotal > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Porcentaje de diferencia: {Math.round(Math.abs(data.expectedTotal - data.actualTotal) / data.expectedTotal * 100)}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Discrepancias detalladas */}
          {data.discrepancies && data.discrepancies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Discrepancias Detectadas
                  <Badge variant="destructive">{data.discrepancies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.discrepancies.map((discrepancy, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <span className="font-mono font-bold">{discrepancy.plate}</span>
                        <div className="text-sm text-muted-foreground">
                          Esperado: {discrepancy.expected} | Real: {discrepancy.actual}
                        </div>
                      </div>
                      <Badge variant="destructive">
                        Diferencia: {Math.abs(discrepancy.expected - discrepancy.actual)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información de última verificación */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última verificación:</span>
                  <span>{formatEventDateTime(data.lastChecked)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Selecciona una fecha y haz clic en "Verificar" para analizar la consistencia de los datos</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

