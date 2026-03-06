import type { DailyConsistencyDTO, MyAlertsDTO, MyRiskDTO, MyStatsDTO } from "@/services/dto"
import { sessionApiFetch } from "@/services/api/http"

export const dashboardApi = {
  myStats: () => sessionApiFetch<MyStatsDTO>("/api/email/my-stats"),
  myRisk: () => sessionApiFetch<MyRiskDTO>("/api/email/my-risk"),
  myAlerts: (params?: { limit?: number; startAfter?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.startAfter) query.set("startAfter", params.startAfter)
    const suffix = query.toString() ? `?${query.toString()}` : ""
    return sessionApiFetch<MyAlertsDTO>(`/api/email/my-alerts${suffix}`)
  },
  dailyConsistency: (date: string) => sessionApiFetch<DailyConsistencyDTO>(`/api/email/daily-consistency?date=${date}`),
}

