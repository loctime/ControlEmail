"use client"

import { useState, useMemo } from "react"
import { Eye, Filter, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { VehicleEvent, EventType, EventStatus } from "@/lib/data"
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

interface EventsContentProps {
  events: VehicleEvent[]
  searchQuery: string
  onViewDetail: (event: VehicleEvent) => void
}

export function EventsContent({
  events,
  searchQuery,
  onViewDetail,
}: EventsContentProps) {
  const [typeFilter, setTypeFilter] = useState<string>("todos")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [localSearch, setLocalSearch] = useState("")

  const filteredEvents = useMemo(() => {
    let filtered = events

    const search = searchQuery || localSearch
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.patente.toLowerCase().includes(q) ||
          e.vehiculo.toLowerCase().includes(q) ||
          e.conductor.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      )
    }

    if (typeFilter !== "todos") {
      filtered = filtered.filter((e) => e.tipo === typeFilter)
    }

    if (statusFilter !== "todos") {
      filtered = filtered.filter((e) => e.estado === statusFilter)
    }

    return filtered
  }, [events, searchQuery, localSearch, typeFilter, statusFilter])

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold">Registro de eventos</h2>
        <p className="text-xs text-muted-foreground">
          {filteredEvents.length} eventos encontrados
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por patente, vehiculo o conductor..."
                className="h-8 pl-8 text-xs"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {(Object.keys(eventTypeLabels) as EventType[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {eventTypeLabels[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(Object.keys(eventStatusLabels) as EventStatus[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {eventStatusLabels[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Fecha/Hora</TableHead>
                  <TableHead className="text-xs">Patente</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">
                    Vehiculo
                  </TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">
                    Velocidad
                  </TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs text-right">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      No se encontraron eventos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewDetail(event)}
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {event.id}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span>{event.fecha}</span>
                          <span className="text-muted-foreground">
                            {event.hora}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {event.patente}
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">
                        {event.vehiculo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            getTypeBadgeVariant(event.tipo) as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                          }
                          className="text-[10px] whitespace-nowrap"
                        >
                          {eventTypeLabels[event.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs hidden lg:table-cell font-mono">
                        {event.velocidad
                          ? `${event.velocidad} / ${event.limiteVelocidad} km/h`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${getStatusColor(event.estado)}`}
                        >
                          {eventStatusLabels[event.estado]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewDetail(event)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only">Ver detalle</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
