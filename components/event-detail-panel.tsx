"use client"

import React from "react"

import {
  X,
  MapPin,
  Clock,
  User,
  Car,
  Gauge,
  FileText,
  MessageSquare,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { VehicleEvent } from "@/lib/data"
import { eventTypeLabels, eventStatusLabels } from "@/lib/data"

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

interface EventDetailPanelProps {
  event: VehicleEvent | null
  open: boolean
  onClose: () => void
}

export function EventDetailPanel({
  event,
  open,
  onClose,
}: EventDetailPanelProps) {
  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-base font-semibold">
                {event.id}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Detalle del evento registrado
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mt-1 -mr-1"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary" className="text-xs">
              {eventTypeLabels[event.tipo]}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(event.estado)}`}
            >
              {eventStatusLabels[event.estado]}
            </span>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="flex flex-col gap-6 p-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label="Fecha y hora"
                value={`${event.fecha} ${event.hora}`}
              />
              <InfoItem
                icon={<Car className="h-4 w-4" />}
                label="Vehiculo"
                value={event.vehiculo}
              />
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Conductor"
                value={event.conductor}
              />
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="Ubicacion"
                value={event.ubicacion}
              />
              {event.velocidad && (
                <>
                  <InfoItem
                    icon={<Gauge className="h-4 w-4" />}
                    label="Velocidad registrada"
                    value={`${event.velocidad} km/h`}
                    highlight
                  />
                  <InfoItem
                    icon={<Gauge className="h-4 w-4" />}
                    label="Limite permitido"
                    value={`${event.limiteVelocidad} km/h`}
                  />
                </>
              )}
            </div>

            <Separator />

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Descripcion</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {event.descripcion}
              </p>
            </div>

            {/* Notes */}
            {event.notas.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">
                      Historial de notas ({event.notas.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {event.notas.map((nota, index) => (
                      <div
                        key={`note-${event.id}-${index}`}
                        className="rounded-lg border bg-muted/50 p-3"
                      >
                        <p className="text-xs text-muted-foreground">
                          {nota}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Patente */}
            <Separator />
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Patente</span>
                <span className="font-mono text-sm font-bold">
                  {event.patente}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function InfoItem({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <span
        className={`text-xs font-medium ${highlight ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
