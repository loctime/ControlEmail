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

export interface VehiclePlateDetailDTO {
  vehicle: VehicleDoc
  dateKey: string
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
