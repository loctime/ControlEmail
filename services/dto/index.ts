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
  /** Severidad agregada actual derivada de riskScore. */
  aggregatedSeverity?: Severity

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
  /** Severidad de negocio del evento individual. */
  eventSeverity: Severity
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
  /** Severidad agregada de negocio para la alerta diaria. */
  aggregatedSeverity?: Severity
  driverName?: string | null
  lastUpdatedAt?: string
}

// ==== DTOs explícitos para endpoints legacy usados por UI ====

export interface VehicleListItemDTO {
  id: string
  patente: string
  modelo: string
  marca: string
  anio: number
  conductor: string | null
  estado: "activo" | "inactivo" | "mantenimiento"
  ultimaUbicacion: string | null
  eventosHoy: number
}

export interface VehicleEventLegacyDTO {
  id: string
  fecha: string
  hora: string
  patente: string
  vehiculo: string | null
  conductor: string | null
  tipo: string
  velocidad?: number
  limiteVelocidad?: number
  ubicacion: string | null
  estado: "pendiente" | "en_revision" | "resuelto" | "critico"
  descripcion: string
  notas: string[]
}

export interface VehiclePlateDetailDTO {
  vehicle: VehicleDoc
  dateKey: string
  events: import("@/lib/firestore-read").DailyAlertVehicle["events"]
  speedIncidents: import("@/lib/firestore-read").DailyAlertVehicle["speedIncidents"]
  summary: import("@/lib/firestore-read").DailyAlertVehicle["summary"]
  totalEventsCount: number
  storedEventsCount: number
  eventsTruncated: boolean
  truncatedEventsCount: number
  incidentSummary?: import("@/lib/firestore-read").DailyAlertVehicle["incidentSummary"]
  previousTotalEventsCount: number
  ranking: {
    position: number
    totalVehicles: number
  }
  operationName: string | null
  /** Risk score agregado actual del vehículo (si existe). */
  riskScore?: number
  /** Severidad agregada actual derivada de riskScore. */
  aggregatedSeverity?: Severity
}

export interface MarkAlertSentResultDTO {
  requested: number
  updated: string[]
  failed: Array<{ plate: string; error: string }>
}

// ==== DTOs del contrato frontend recomendado (my-*) ====

export interface MeDTO {
  ok: boolean
  email: string
  role: "admin" | "general" | "report" | "responsable"
}

export interface MyVehiclesItemDTO {
  id: string
  plate: string
  brand: string
  model: string
  responsables: string[]
  responsablesNormalized: string[]
  operationName: string | null
}

export interface MyVehiclesDTO {
  ok: boolean
  vehicles: MyVehiclesItemDTO[]
}

export interface MyAlertItemDTO {
  alertId: string
  plate: string
  dateKey: string
  riskScore: number
  alertSent: boolean
  lastEventAt: string | null
}

export interface MyAlertsDTO {
  ok: boolean
  alerts: MyAlertItemDTO[]
  startAfter: string | null
}

export interface MyAlertsVehiclesItemDTO {
  plate: string
  operationName: string | null
  lastEvent: string
  riskScore: number
}

export interface MyAlertsVehiclesDTO {
  ok: boolean
  vehicles: MyAlertsVehiclesItemDTO[]
}

export interface MyStatsDTO {
  ok: boolean
  stats: {
    totalAlerts: number
    alertsToday: number
    alertsPending: number
    alertsSent: number
    maxRisk: number
    avgRisk: number
  }
}

export interface MyRiskItemDTO {
  plate: string
  alerts: number
  maxRisk: number
}

export interface MyRiskDTO {
  ok: boolean
  vehicles: MyRiskItemDTO[]
}
