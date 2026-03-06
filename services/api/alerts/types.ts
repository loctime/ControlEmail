import type { DailyAlertMeta, DailyAlertVehicle } from "@/lib/firestore-read"

export type DailyAlertMetaDTO = DailyAlertMeta

export type DailyAlertDTO = DailyAlertVehicle

export interface MarkAlertSentResultDTO {
  requested: number
  updated: string[]
  failed: Array<{ plate: string; error: string }>
}

export interface DebugPendingAlertDTO {
  id: string
  vehicleId: string
  plate: string
  date: string
  status: "PENDING" | "SENT" | "FAILED"
  reason?: string
  aggregatedSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  driverName?: string | null
  lastUpdatedAt?: string
}
