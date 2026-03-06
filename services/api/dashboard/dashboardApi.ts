import { apiClient } from "@/services/api/client"
import { qualityApi } from "@/services/api/quality/qualityApi"
import type {
  DashboardDailyConsistencyDTO,
  MyAlertsDTO,
  MyRiskDTO,
  MyStatsDTO,
} from "@/services/api/dashboard/types"

export const dashboardApi = {
  myStats: () => apiClient.get<MyStatsDTO>("/api/email/my-stats"),
  myRisk: () => apiClient.get<MyRiskDTO>("/api/email/my-risk"),
  myAlerts: (params?: { limit?: number; startAfter?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.startAfter) query.set("startAfter", params.startAfter)
    const suffix = query.toString() ? `?${query.toString()}` : ""
    return apiClient.get<MyAlertsDTO>(`/api/email/my-alerts${suffix}`)
  },
  dailyConsistency: (date: string): Promise<DashboardDailyConsistencyDTO> => qualityApi.dailyConsistency(date),
}
