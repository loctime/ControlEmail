export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

// Reutilizamos los tipos ya leídos desde Firestore como base de los DTOs,
// para no romper el contrato actual mientras migramos progresivamente.
import type {
  DailyAlertVehicle,
  DailyAlertMeta,
  DailyAlertsResponse,
  DailyConsistency,
  VehicleDoc,
} from "@/lib/firestore-read"

// ==== DTOs de dominio de emails / alertas diarias ====

export type DailyAlertMetaDTO = DailyAlertMeta

export type DailyAlertDTO = DailyAlertVehicle

export type DailyMetricsDTO = DailyAlertsResponse

export type DailyConsistencyDTO = DailyConsistency

// ==== DTOs de vehículos ====

export interface VehicleDTO {
  /** ID interno del vehículo (Firestore/backend). */
  id: string
  /** Matrícula normalizada. */
  licensePlate: string
  /** ID en sistemas externos (opcional). */
  externalId?: string

  /** Vehículo vigente/activo. */
  isActive: boolean
  /** Timestamp ISO del último evento relevante. */
  lastEventAt: string | null

  /** Risk score agregado actual (solo backend). */
  riskScore?: number
  /** Severidad agregada actual. */
  severity?: Severity

  /** Último conductor conocido. */
  driverName: string | null
  driverId?: string

  /** Tipo principal de email origen del estado actual. */
  sourceEmailType?: string

  /** Auditoría básica. */
  createdAt?: string
  updatedAt?: string
  lastAlertSentAt?: string
}

// Conversión básica desde VehicleDoc (Firestore) a VehicleDTO.
// Se puede ir enriqueciendo a medida que el backend exponga más campos.
export function mapVehicleDocToDTO(doc: VehicleDoc): VehicleDTO {
  return {
    id: doc.id,
    licensePlate: doc.plate,
    externalId: undefined,
    isActive: true,
    lastEventAt: doc.lastEventAt ?? null,
    driverName: doc.driver ?? null,
    driverId: undefined,
    sourceEmailType: undefined,
    createdAt: undefined,
    updatedAt: doc.updatedAt,
    lastAlertSentAt: undefined,
  }
}

// ==== DTO de detalle de vehículo ====

export interface VehicleEventSummaryDTO {
  id: string
  timestamp: string
  severity: Severity
  eventType: string
  driverName: string | null
  sourceEmailType: string
  inboxId?: string
}

export interface VehicleDetailDTO extends VehicleDTO {
  events: VehicleEventSummaryDTO[]
  pendingAlertsCount: number
  lastAlertDate?: string
  lastUpdatedAt?: string
}

// ==== DTO para debug de alertas pendientes ====

export interface DebugPendingAlertDTO {
  id: string
  vehicleId: string
  plate: string
  date: string
  status: "PENDING" | "SENT" | "FAILED"
  reason?: string
  severity?: Severity
  driverName?: string | null
  lastUpdatedAt?: string
}

