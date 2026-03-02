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
import type { VehicleEventDashboard } from "@/lib/firestore-read"
import { formatEventDateTime } from "@/lib/ui/datetime"

interface VehicleEventsTableProps {
  events: VehicleEventDashboard[]
  loading: boolean
}

export function VehicleEventsTable({ events, loading }: VehicleEventsTableProps) {
  const getSeverityBadge = (severity: "critico" | "advertencia") => {
    if (severity === "critico") {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
        >
          Crítico
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
      >
        Advertencia
      </Badge>
    )
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

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos del Vehículo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay eventos registrados para este vehículo en el período seleccionado.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos del Vehículo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Velocidad</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Severidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    {formatEventDateTime(event.eventTimestamp)}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{event.type.replace(/_/g, " ")}</span>
                  </TableCell>
                  <TableCell>
                    {event.speed != null ? (
                      <span className="font-semibold">{event.speed} km/h</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {event.location ? (
                      <span className="text-sm">{event.location}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
