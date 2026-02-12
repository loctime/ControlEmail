/**
 * Tokens de estado centralizados para StatusBadge y badges de tipo de evento.
 * Evita duplicación de getStatusColor / getVehicleStatusBadge / getTypeBadgeVariant.
 */

export type EventStatus =
  | "critico"
  | "pendiente"
  | "en_revision"
  | "resuelto"

export type VehicleStatus = "activo" | "inactivo" | "mantenimiento"

export type EventType =
  | "exceso_velocidad"
  | "vehiculo_no_identificado"
  | "desvio_ruta"
  | "parada_no_autorizada"
  | "conduccion_nocturna"

export const statusEventVariants: Record<EventStatus, string> = {
  critico: "bg-destructive/15 text-destructive border-destructive/20",
  pendiente: "bg-warning/15 text-warning border-warning/20",
  en_revision: "bg-primary/15 text-primary border-primary/20",
  resuelto: "bg-success/15 text-success border-success/20",
}

export const statusVehicleVariants: Record<VehicleStatus, string> = {
  activo: "bg-success/15 text-success border-success/20",
  inactivo: "bg-muted text-muted-foreground border-border",
  mantenimiento: "bg-warning/15 text-warning border-warning/20",
}

export const typeBadgeVariants: Record<
  EventType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  exceso_velocidad: "destructive",
  vehiculo_no_identificado: "default",
  desvio_ruta: "secondary",
  parada_no_autorizada: "outline",
  conduccion_nocturna: "secondary",
}

export function getEventStatusVariant(
  estado: string
): keyof typeof statusEventVariants | null {
  if (estado in statusEventVariants) {
    return estado as keyof typeof statusEventVariants
  }
  return null
}

export function getVehicleStatusVariant(
  estado: string
): keyof typeof statusVehicleVariants | null {
  if (estado in statusVehicleVariants) {
    return estado as keyof typeof statusVehicleVariants
  }
  return null
}

export function getTypeBadgeVariant(
  tipo: string
): "default" | "secondary" | "destructive" | "outline" {
  return typeBadgeVariants[tipo as EventType] ?? "default"
}
