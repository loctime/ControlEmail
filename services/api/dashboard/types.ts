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

/** Single top speed event for HighestSpeedCard */
export interface TopSpeedEventDTO {
  plate: string
  speed: number
  location: string | null
  timestamp: string | null
}

/** Enriched per-vehicle data for SuperDashboard (Operational Risk + Admin Alerts) */
export interface DashboardVehicleDetailDTO {
  plate: string
  excesos: number
  maxSpeed: number | null
  topSpeedEvent: TopSpeedEventDTO | null
  speedingDrivers: string[]
  llave_sin_cargar: number
  no_identificados: number
  contactos: number
  conductor_inactivo: number
}

/** Admin alerts totals for Tab 2 */
export interface AdminTotalsDTO {
  llave_sin_cargar: number
  no_identificados: number
  contactos: number
  conductor_inactivo: number
}

/** Per-day point for RiskTrendChart (week response only) */
export interface DailyBreakdownPointDTO {
  date: string
  totalExcessEvents: number
  avgRisk: number
}

export interface DashboardAggregatedPayload {
  stats: DashboardAggregatedStats
  vehicles?: MyRiskItemDTO[]
  pendingAlerts?: MyAlertItemDTO[]
  consistency?: DailyConsistencyDTO | null
  /** SuperDashboard: per-vehicle enriched data */
  vehicleDetails?: DashboardVehicleDetailDTO[]
  /** SuperDashboard: admin alert category totals */
  adminTotals?: AdminTotalsDTO
  /** SuperDashboard: last 7 days breakdown (week response only) */
  dailyBreakdown?: DailyBreakdownPointDTO[]
}
