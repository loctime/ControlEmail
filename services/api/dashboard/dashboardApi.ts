import { apiClient } from "@/services/api/client"
import { qualityApi } from "@/services/api/quality/qualityApi"
import type {
  DashboardDailyConsistencyDTO,
  MyAlertsDTO,
  MyRiskDTO,
  MyStatsDTO,
} from "@/services/api/dashboard/types"

export const dashboardApi = {
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
