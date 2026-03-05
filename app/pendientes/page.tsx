"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, CheckCircle, Clock, AlertTriangle, Send } from "lucide-react"
import { emailModuleService } from "@/services/emailModule"
import type { DailyAlertDTO } from "@/services/dto"

export default function PendientesPage() {
  const [pendingAlerts, setPendingAlerts] = useState<DailyAlertDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadPendingAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      const alerts = await emailModuleService.getPendingAlerts()
      setPendingAlerts(alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    loadPendingAlerts()
  })

  const handleMarkAsSent = async (plate: string) => {
    setSending(prev => [...prev, plate])
    try {
      await emailModuleService.markAlertSent([plate])
      setPendingAlerts(prev => prev.filter(v => v.plate !== plate))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al marcar como enviado")
    } finally {
      setSending(prev => prev.filter(p => p !== plate))
    }
  }

  const handleMarkAllAsSent = async () => {
    const plates = pendingAlerts.map(v => v.plate)
    setSending(plates)
    try {
      await emailModuleService.markAlertSent(plates)
      setPendingAlerts([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al marcar todos como enviados")
    } finally {
      setSending([])
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-4 w-96 bg-muted rounded"></div>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas Pendientes</h1>
          <p className="text-muted-foreground">
            Alertas diarias que aún no han sido enviadas a los responsables
          </p>
        </div>
        
        {pendingAlerts.length > 0 && (
          <Button onClick={handleMarkAllAsSent} disabled={sending.length > 0}>
            <Send className="mr-2 h-4 w-4" />
            Marcar todos como enviados ({pendingAlerts.length})
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alertas Pendientes de Envío
            <Badge variant="secondary">{pendingAlerts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-500" />
              <p>No hay alertas pendientes de envío</p>
              <p className="text-sm">Todas las alertas han sido enviadas correctamente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Críticos</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAlerts.map((vehicle) => (
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
                        {(vehicle.riskScore ?? 0) > 15 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        Pendiente
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsSent(vehicle.plate)}
                        disabled={sending.includes(vehicle.plate)}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {sending.includes(vehicle.plate) ? "Enviando..." : "Marcar enviado"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

