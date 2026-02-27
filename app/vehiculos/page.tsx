"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { emailModuleService } from "@/services/emailModule"
import type { DailyAlertsResponse } from "@/services/emailModule"

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [data, setData] = useState<DailyAlertsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().split("T")[0]
      const metrics = await emailModuleService.getDailyMetrics(today)
      setData(metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    loadData()
  })

  const filteredVehicles = data?.vehicles.filter(vehicle =>
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? []

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-4 w-96 bg-muted rounded"></div>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
        <p className="text-muted-foreground">
          Vista general de todos los vehículos y su estado actual
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por patente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={loadData} variant="outline">
          Actualizar
        </Button>
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
          <CardTitle>
            Vehículos con Eventos Hoy
            <Badge variant="secondary" className="ml-2">
              {filteredVehicles.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay vehículos que coincidan con la búsqueda</p>
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
                  <TableHead>Estado Alerta</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
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
                        {vehicle.riskScore > 15 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {vehicle.lastEventAt ? new Date(vehicle.lastEventAt).toLocaleString("es-AR") : "N/A"}
                    </TableCell>
                    <TableCell>
                      {vehicle.alertSent ? (
                        <Badge variant="default">
                          Enviado {vehicle.sentAt ? new Date(vehicle.sentAt).toLocaleTimeString("es-AR") : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/vehiculos/${vehicle.plate}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </Button>
                      </Link>
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
