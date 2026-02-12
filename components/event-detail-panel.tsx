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
import { AppButton } from "@/components/app-button"
import { StatusBadge } from "@/components/status-badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { VehicleEvent } from "@/lib/data"
import { eventTypeLabels, eventStatusLabels } from "@/lib/data"
import { getTypeBadgeVariant } from "@/lib/status-tokens"

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
            <AppButton
              variant="ghost"
              size="icon"
              className="-mt-1 -mr-1"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </AppButton>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant={getTypeBadgeVariant(event.tipo)} className="text-sm">
              {eventTypeLabels[event.tipo]}
            </Badge>
            <StatusBadge status={event.estado} variant="event">
              {eventStatusLabels[event.estado]}
            </StatusBadge>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="flex flex-col gap-6 p-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={<Clock className="h-5 w-5" />}
                label="Fecha y hora"
                value={`${event.fecha} ${event.hora}`}
              />
              <InfoItem
                icon={<Car className="h-5 w-5" />}
                label="Vehiculo"
                value={event.vehiculo}
              />
              <InfoItem
                icon={<User className="h-5 w-5" />}
                label="Conductor"
                value={event.conductor}
              />
              <InfoItem
                icon={<MapPin className="h-5 w-5" />}
                label="Ubicacion"
                value={event.ubicacion}
              />
              {event.velocidad && (
                <>
                  <InfoItem
                    icon={<Gauge className="h-5 w-5" />}
                    label="Velocidad registrada"
                    value={`${event.velocidad} km/h`}
                    highlight
                  />
                  <InfoItem
                    icon={<Gauge className="h-5 w-5" />}
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
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Descripcion</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {event.descripcion}
              </p>
            </div>

            {/* Notes */}
            {event.notas.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Historial de notas ({event.notas.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {event.notas.map((nota, index) => (
                      <div
                        key={`note-${event.id}-${index}`}
                        className="rounded-lg border bg-muted/50 p-3"
                      >
                        <p className="text-sm text-muted-foreground">
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
                <span className="text-sm text-muted-foreground">Patente</span>
                <span className="font-mono text-base font-bold">
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
        <span className="text-xs">{label}</span>
      </div>
      <span
        className={`text-sm font-medium ${highlight ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
