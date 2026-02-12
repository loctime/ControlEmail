"use client"

import { Eye } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { VehicleEvent } from "@/lib/data"
import { eventTypeLabels, eventStatusLabels } from "@/lib/data"

function getTypeBadgeVariant(tipo: string) {
  switch (tipo) {
    case "exceso_velocidad":
      return "destructive"
    case "vehiculo_no_identificado":
      return "default"
    case "desvio_ruta":
      return "secondary"
    case "parada_no_autorizada":
      return "outline"
    case "conduccion_nocturna":
      return "secondary"
    default:
      return "default"
  }
}

function getStatusColor(estado: string) {
  switch (estado) {
    case "critico":
      return "bg-destructive/15 text-destructive border-destructive/20"
    case "pendiente":
      return "bg-chart-3/15 text-chart-3 border-chart-3/20"
    case "en_revision":
      return "bg-chart-1/15 text-chart-1 border-chart-1/20"
    case "resuelto":
      return "bg-chart-2/15 text-chart-2 border-chart-2/20"
    default:
      return ""
  }
}

interface RecentEventsTableProps {
  events: VehicleEvent[]
  onViewDetail: (event: VehicleEvent) => void
}

export function RecentEventsTable({
  events,
  onViewDetail,
}: RecentEventsTableProps) {
  const recentEvents = events.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Ultimos eventos
        </CardTitle>
        <CardDescription className="text-xs">
          Eventos mas recientes registrados en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Hora</TableHead>
                <TableHead className="text-xs">Patente</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">
                  Tipo
                </TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs text-right">Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs font-mono">
                    {event.hora}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {event.patente}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant={getTypeBadgeVariant(event.tipo) as "default" | "secondary" | "destructive" | "outline"}
                      className="text-[10px]"
                    >
                      {eventTypeLabels[event.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(event.estado)}`}
                    >
                      {eventStatusLabels[event.estado]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onViewDetail(event)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="sr-only">Ver detalle</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
