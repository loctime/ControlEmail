import type { DailyAlertVehicle, VehicleDoc } from "@/lib/firestore-read"

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

export interface MyAlertsVehiclesItemDTO {
  plate: string
  operationName: string | null
  lastEvent: string
  riskScore: number
  totalEventsCount: number
}

export interface MyAlertsVehiclesDTO {
  ok: boolean
  vehicles: MyAlertsVehiclesItemDTO[]
}

export type DaysBack = 7 | 30 | 90

export interface VehicleEventsParams {
  dateFrom: string
  dateTo: string
  plate?: string
  eventType?: string
  limit?: number
  page?: number
}

export interface VehicleEventItem {
  eventId: string
  plate: string
  dateKey?: string | null
  brand?: string | null
  model?: string | null
  operationName?: string | null
  operacion?: string | null
  eventType?: string | null
  rawEventType?: string | null
  sourceEmailType?: string | null
  eventCategory?: string | null
  incidentKey?: string | null
  groupedEventsCount?: number | null
  hasSpeed?: boolean
  severity?: string | null
  driverName?: string | null
  keyId?: string | null
  speed?: number | null
  speedLimit?: number | null
  speedDelta?: number | null
  maxSpeed?: number | null
  eventTimestamp: string
  location?: string | null
  locationRaw?: string | null
  reason?: string | null
}

export interface VehicleEventsResponse {
  ok: boolean
  events: VehicleEventItem[]
  total: number
  page: number
  limit: number
  plates: string[]
  dateRange: { from: string; to: string }
}

export interface VehiclePlateDetailDTO {
  vehicle: VehicleDoc
  dateKey: string
  operationName?: string | null
  events: DailyAlertVehicle["events"]
  speedIncidents: DailyAlertVehicle["speedIncidents"]
  summary: DailyAlertVehicle["summary"]
  totalEventsCount: number
  storedEventsCount: number
  eventsTruncated: boolean
  truncatedEventsCount: number
  incidentSummary?: DailyAlertVehicle["incidentSummary"]
  previousTotalEventsCount: number
  ranking: {
    position: number
    totalVehicles: number
  }
  riskScore?: number
  aggregatedSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}
