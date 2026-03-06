import type { VehicleDoc, VehicleEventDashboard } from "@/lib/firestore-read"

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
}

export interface MyAlertsVehiclesDTO {
  ok: boolean
  vehicles: MyAlertsVehiclesItemDTO[]
}

export type DaysBack = 7 | 30 | 90

export interface VehiclePlateDetailDTO {
  vehicle: VehicleDoc
  events: VehicleEventDashboard[]
  previousEvents: VehicleEventDashboard[]
  ranking: {
    position: number
    totalVehicles: number
  }
  riskScore?: number
  aggregatedSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}
