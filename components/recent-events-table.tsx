"use client"

import { Eye } from "lucide-react"
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
  AppCardContent,
} from "@/components/app-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AppButton } from "@/components/app-button"
import { StatusBadge } from "@/components/status-badge"
import { EventTypeBadge } from "@/components/event-type-badge"
import type { VehicleEvent } from "@/lib/data"
import { eventStatusLabels } from "@/lib/data"

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
    <AppCard className="flex flex-col p-0">
      <AppCardHeader className="p-5 pb-3">
        <AppCardTitle className="text-base font-medium">
          Ultimos eventos
        </AppCardTitle>
        <AppCardDescription className="text-sm">
          Eventos mas recientes registrados en el sistema
        </AppCardDescription>
      </AppCardHeader>
      <AppCardContent className="flex-1 p-0 px-5 pb-5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm font-medium">Hora</TableHead>
                <TableHead className="text-sm font-medium">Patente</TableHead>
                <TableHead className="hidden text-sm font-medium sm:table-cell">
                  Tipo
                </TableHead>
                <TableHead className="text-sm font-medium">Estado</TableHead>
                <TableHead className="text-right text-sm font-medium">
                  Accion
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents.map((event) => (
                <TableRow key={event.id} className="min-h-[48px]">
                  <TableCell className="py-3 font-mono text-sm">
                    {event.hora}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium">
                    {event.patente}
                  </TableCell>
                  <TableCell className="hidden py-3 sm:table-cell">
                    <EventTypeBadge tipo={event.tipo} className="text-sm" />
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusBadge status={event.estado} variant="event">
                      {eventStatusLabels[event.estado]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <AppButton
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(event)}
                      aria-label="Ver detalle"
                    >
                      <Eye className="h-5 w-5" />
                    </AppButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AppCardContent>
    </AppCard>
  )
}
