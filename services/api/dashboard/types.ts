import type { DailyConsistencyDTO } from "@/services/api/quality/types"

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

export type DashboardDailyConsistencyDTO = DailyConsistencyDTO

/** Payload returned by ControlFile aggregated endpoints (metrics/daily, monthly, yearly) */
export interface DashboardAggregatedStats {
  totalAlerts: number
  alertsPending?: number
  alertsSent?: number
  maxRisk?: number
  avgRisk?: number
}

export interface DashboardAggregatedPayload {
  stats: DashboardAggregatedStats
  vehicles?: MyRiskItemDTO[]
  pendingAlerts?: MyAlertItemDTO[]
  consistency?: DailyConsistencyDTO | null
}
