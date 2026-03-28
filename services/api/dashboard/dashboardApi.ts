import { apiClient } from "@/services/api/client"
import { qualityApi } from "@/services/api/quality/qualityApi"
import type {
  DashboardAggregatedPayload,
  DashboardDailyConsistencyDTO,
  MyAlertsDTO,
  MyRiskDTO,
  MyStatsDTO,
} from "@/services/api/dashboard/types"
import type { DashboardRangeParams } from "@/services/dashboard-api"

export const dashboardApi = {
  /** GET /api/dashboard/enriched?period=&date= — único endpoint agregado enriquecido */
  getEnriched: (period: "day" | "week" | "month" | "year", dateParam: string) => {
    const qs = new URLSearchParams({ period, date: dateParam })
    return apiClient.get<DashboardAggregatedPayload>(`/api/dashboard/enriched?${qs.toString()}`, {
      authMode: "firebase",
    })
  },

  /**
   * GET /api/dashboard/enriched?startDate=&endDate=
   * Rango arbitrario (YYYY-MM-DD). Alineado con `DashboardRangeParams` cuando range es "custom".
   */
  getEnrichedRange: (params: Pick<DashboardRangeParams, "startDate" | "endDate"> & { startDate: string; endDate: string }) => {
    const qs = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    })
    return apiClient.get<DashboardAggregatedPayload>(`/api/dashboard/enriched?${qs.toString()}`, {
      authMode: "firebase",
    })
  },

  /** Compat: mismos params que getEnriched( "day" | …, dateParam ) */
  getDay: (dateKey: string) => dashboardApi.getEnriched("day", dateKey),

  getWeek: (dateKey: string) => dashboardApi.getEnriched("week", dateKey),

  getMonth: (dateKey: string) => dashboardApi.getEnriched("month", dateKey.slice(0, 7)),

  getYear: (dateKey: string) => dashboardApi.getEnriched("year", dateKey.slice(0, 4)),

  myStats: (date: string) =>
    apiClient.get<MyStatsDTO>(`/api/email/my-stats?date=${encodeURIComponent(date)}`),
  myRisk: (date: string) =>
    apiClient.get<MyRiskDTO>(`/api/email/my-risk?date=${encodeURIComponent(date)}`),
  myAlerts: (params: { date: string; limit?: number; startAfter?: string }) => {
    const query = new URLSearchParams()
    query.set("date", params.date)
    if (params.limit != null) query.set("limit", String(params.limit))
    if (params.startAfter) query.set("startAfter", params.startAfter)
    const suffix = query.toString() ? `?${query.toString()}` : ""
    return apiClient.get<MyAlertsDTO>(`/api/email/my-alerts${suffix}`)
  },
  dailyConsistency: (date: string): Promise<DashboardDailyConsistencyDTO> =>
    qualityApi.dailyConsistency(date),
  myLastDateWithData: () =>
    apiClient.get<{ date: string; minDate: string; maxDate: string }>(
      "/api/email/my-last-date-with-data",
    ),
}
