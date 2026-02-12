"use client"

import { useState, useMemo } from "react"
import { Eye, Filter, Search } from "lucide-react"
import { AppCard } from "@/components/app-card"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
import { FormInput } from "@/components/form-input"
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
import { AppButton } from "@/components/app-button"
import { StatusBadge } from "@/components/status-badge"
import type { VehicleEvent, EventType, EventStatus } from "@/lib/data"
import { eventTypeLabels, eventStatusLabels } from "@/lib/data"
import { getTypeBadgeVariant } from "@/lib/status-tokens"

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
    <PageContainer>
      <SectionHeader
        title="Registro de eventos"
        description={`${filteredEvents.length} eventos encontrados`}
      />

      <AppCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <FormInput
              placeholder="Buscar por patente, vehiculo o conductor..."
              className="pl-10"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 min-w-[160px] text-sm">
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
                <SelectTrigger className="h-11 min-w-[140px] text-sm">
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
      </AppCard>

      <AppCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-medium">ID</TableHead>
                  <TableHead className="text-sm font-medium">Fecha/Hora</TableHead>
                  <TableHead className="text-sm font-medium">Patente</TableHead>
                  <TableHead className="hidden text-sm font-medium md:table-cell">
                    Vehiculo
                  </TableHead>
                  <TableHead className="text-sm font-medium">Tipo</TableHead>
                  <TableHead className="hidden text-sm font-medium lg:table-cell">
                    Velocidad
                  </TableHead>
                  <TableHead className="text-sm font-medium">Estado</TableHead>
                  <TableHead className="text-right text-sm font-medium">
                    Accion
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
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
                      <TableCell className="py-3 font-mono text-sm text-muted-foreground">
                        {event.id}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        <div className="flex flex-col">
                          <span>{event.fecha}</span>
                          <span className="text-muted-foreground">
                            {event.hora}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium">
                        {event.patente}
                      </TableCell>
                      <TableCell className="hidden py-3 text-sm md:table-cell">
                        {event.vehiculo}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant={getTypeBadgeVariant(event.tipo)}
                          className="whitespace-nowrap text-sm"
                        >
                          {eventTypeLabels[event.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden py-3 font-mono text-sm lg:table-cell">
                        {event.velocidad
                          ? `${event.velocidad} / ${event.limiteVelocidad} km/h`
                          : "-"}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge
                          status={event.estado}
                          variant="event"
                          className="whitespace-nowrap"
                        >
                          {eventStatusLabels[event.estado]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <AppButton
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewDetail(event)
                          }}
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-5 w-5" />
                        </AppButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
      </AppCard>
    </PageContainer>
  )
}
