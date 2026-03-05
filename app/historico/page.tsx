"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, Eye, Mail, CheckCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { emailModuleService } from "@/services/emailModule"
import type { DailyMetricsDTO } from "@/services/dto"
import { formatEventDateTime, formatEventTime } from "@/lib/ui/datetime"

export default function HistoricoPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [data, setData] = useState<DailyMetricsDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistoricalData = async () => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const metrics = await emailModuleService.getDailyMetrics(dateStr)
      setData(metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    loadHistoricalData()
  })

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Alertas</h1>
          <p className="text-muted-foreground">
            Consulta alertas generadas en fechas específicas
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
          
          <Button onClick={loadHistoricalData} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Cargar datos
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

      {data && (
        <div className="space-y-6">
          {/* Resumen del día */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del {format(selectedDate, "PPP", { locale: es })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.meta.totalEvents}</div>
                  <div className="text-sm text-muted-foreground">Total Eventos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.meta.totalVehicles}</div>
                  <div className="text-sm text-muted-foreground">Vehículos Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{data.meta.totalCriticos}</div>
                  <div className="text-sm text-muted-foreground">Eventos Críticos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.meta.vehiclesWithCritical}</div>
                  <div className="text-sm text-muted-foreground">Vehículos con Críticos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado de envíos */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de Envíos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.vehicles.length}</div>
                  <div className="text-sm text-muted-foreground">Total Alertas Generadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {data.vehicles.filter(v => v.alertSent).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Alertas Enviadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {data.vehicles.filter(v => !v.alertSent).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Alertas Pendientes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalle por vehículo */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle por Vehículo</CardTitle>
            </CardHeader>
            <CardContent>
              {data.vehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay alertas para esta fecha</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patente</TableHead>
                      <TableHead>Total Eventos</TableHead>
                      <TableHead>Críticos</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Último Evento</TableHead>
                      <TableHead>Estado Envío</TableHead>
                      <TableHead>Enviado a las</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.vehicles
                      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
                      .map((vehicle) => (
                      <TableRow key={vehicle.plate}>
                        <TableCell className="font-mono font-bold">{vehicle.plate}</TableCell>
                        <TableCell>{vehicle.summary.totalEvents}</TableCell>
                        <TableCell>
                          <Badge variant={vehicle.summary.criticalEvents > 0 ? "destructive" : "secondary"}>
                            {vehicle.summary.criticalEvents}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{vehicle.riskScore}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatEventDateTime(vehicle.lastEventAt)}
                        </TableCell>
                        <TableCell>
                          {vehicle.alertSent ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatEventTime(vehicle.sentAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

