import { apiClient } from "@/services/api/client"

export type DashboardRangePreset = "today" | "yesterday" | "7d" | "30d" | "custom"

export interface DashboardRangeParams {
  range: DashboardRangePreset
  startDate?: string
  endDate?: string
}

export interface DashboardSummary {
  vehiclesMonitored: number
  vehiclesWithEvents: number
  totalEvents: number
  criticalEvents: number
  maxRisk: number
  avgRisk: number
}

export interface EventDistribution {
  excesos: number
  no_identificados: number
  contactos: number
  llave_sin_cargar: number
  conductor_inactivo: number
}

export interface CriticalAlert {
  plate: string
  eventType: string
  riskScore: number
}

export interface TopVehicle {
  plate: string
  events: number
  riskScore: number
}

export interface RecentEvent {
  timestamp: string
  plate: string
  eventType: string
  riskScore: number
}

export interface RiskMapItem {
  plate: string
  events: number
  riskScore: number
  status: "verde" | "amarillo" | "rojo"
}

export interface TrendPoint {
  date: string
  events: number
}

interface SummaryResponse {
  summary: DashboardSummary
}

interface TopVehiclesResponse {
  items: TopVehicle[]
}

interface EventsResponse {
  distribution: EventDistribution
  criticalAlerts: CriticalAlert[]
  riskMap: RiskMapItem[]
  recentEvents: RecentEvent[]
}

interface TrendResponse {
  trend: TrendPoint[]
}

function toQueryString(params: DashboardRangeParams): string {
  const query = new URLSearchParams()
  query.set("range", params.range)
  if (params.range === "custom") {
    if (params.startDate) query.set("startDate", params.startDate)
    if (params.endDate) query.set("endDate", params.endDate)
  }
  return query.toString()
}

function buildPath(basePath: string, params: DashboardRangeParams): string {
  return `${basePath}?${toQueryString(params)}`
}

export const dashboardApi = {
  getSummary: (params: DashboardRangeParams) =>
    apiClient.get<SummaryResponse>(buildPath("/api/dashboard/summary", params), {
      authMode: "firebase",
    }),
  getTopVehicles: (params: DashboardRangeParams) =>
    apiClient.get<TopVehiclesResponse>(buildPath("/api/dashboard/top-vehicles", params), {
      authMode: "firebase",
    }),
  getEvents: (params: DashboardRangeParams) =>
    apiClient.get<EventsResponse>(buildPath("/api/dashboard/events", params), {
      authMode: "firebase",
    }),
  getTrend: (params: DashboardRangeParams) =>
    apiClient.get<TrendResponse>(buildPath("/api/dashboard/trend", params), {
      authMode: "firebase",
    }),
}
