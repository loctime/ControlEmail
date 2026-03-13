"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { DailyAlertVehicle } from "@/lib/firestore-read"
import { formatEventDateTime } from "@/lib/ui/datetime"

type VehicleDetailEvent = DailyAlertVehicle["events"][number]
type VehicleSpeedIncident = DailyAlertVehicle["speedIncidents"][number]

interface VehicleEventsTableProps {
  events: VehicleDetailEvent[]
  speedIncidents: VehicleSpeedIncident[]
  visibleEvents: VehicleDetailEvent[]
  totalEventsCount: number
  storedEventsCount: number
  eventsTruncated: boolean
  loading: boolean
}

export function VehicleEventsTable({
  events,
  speedIncidents,
  visibleEvents,
  totalEventsCount,
  storedEventsCount,
  eventsTruncated,
  loading,
}: VehicleEventsTableProps) {
  const getSeverityBadge = (severity: string | null) => {
    if (severity === "critico" || severity === "critical") {
      return <Badge variant="destructive">Critico</Badge>
    }
    return <Badge variant="outline">Advertencia</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0 && speedIncidents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos del vehiculo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay eventos registrados para este vehiculo en el periodo seleccionado.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos del vehiculo</CardTitle>
        <p className="text-sm text-muted-foreground">
          {eventsTruncated
            ? `Showing partial events (${storedEventsCount} stored of ${totalEventsCount} total)`
            : `${totalEventsCount} eventos`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {speedIncidents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Incidentes de velocidad</h3>
              {speedIncidents
                .slice()
                .sort((a, b) => (b.lastEventAt ?? "").localeCompare(a.lastEventAt ?? ""))
                .map((incident) => (
                  <div key={incident.incidentKey} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">Exceso de velocidad</p>
                        <p className="text-sm text-muted-foreground">
                          {incident.groupedEventsCount} eventos agrupados
                        </p>
                      </div>
                      {getSeverityBadge(incident.severity)}
                    </div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div>Inicio: {formatEventDateTime(incident.firstEventAt)}</div>
                      <div>Fin: {formatEventDateTime(incident.lastEventAt)}</div>
                      <div>Velocidad maxima: {incident.maxSpeed != null ? `${incident.maxSpeed} km/h` : "-"}</div>
                      <div>Promedio: {incident.avgSpeed != null ? `${incident.avgSpeed} km/h` : "-"}</div>
                      <div>Duracion: {incident.durationSeconds != null ? `${incident.durationSeconds}s` : "-"}</div>
                      <div>Driver: {incident.driverName ?? "-"}</div>
                      <div>Location: {incident.location ?? "-"}</div>
                      <div>Llave: {incident.keyId ?? "-"}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Velocidad</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEvents.map((event) => (
                  <TableRow key={event.eventId}>
                    <TableCell className="font-medium">{formatEventDateTime(event.eventTimestamp)}</TableCell>
                    <TableCell><span className="capitalize">{event.type.replace(/_/g, " ")}</span></TableCell>
                    <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                    <TableCell>{event.driverName ?? "-"}</TableCell>
                    <TableCell>{event.speed != null ? <span className="font-semibold">{event.speed} km/h</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{event.location ?? "-"}</TableCell>
                    <TableCell className="max-w-[360px] truncate" title={event.reason ?? ""}>{event.reason ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {visibleEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay eventos visibles fuera de incidentes agrupados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
