"use client"

import { cn } from "@/lib/utils"
import {
  statusEventVariants,
  statusVehicleVariants,
  getEventStatusVariant,
  getVehicleStatusVariant,
  type EventStatus,
  type VehicleStatus,
} from "@/lib/status-tokens"

type StatusBadgeVariant = "event" | "vehicle"

interface StatusBadgeProps {
  /** Estado del evento: critico, pendiente, en_revision, resuelto */
  status: EventStatus | VehicleStatus | string
  variant?: StatusBadgeVariant
  children: React.ReactNode
  className?: string
}

export function StatusBadge({
  status,
  variant = "event",
  children,
  className,
}: StatusBadgeProps) {
  const eventVariant = variant === "event" ? getEventStatusVariant(status) : null
  const vehicleVariant =
    variant === "vehicle" ? getVehicleStatusVariant(status) : null

  const variantClass =
    eventVariant
      ? statusEventVariants[eventVariant]
      : vehicleVariant
        ? statusVehicleVariants[vehicleVariant]
        : "bg-muted text-muted-foreground border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium",
        variantClass,
        className
      )}
    >
      {children}
    </span>
  )
}
