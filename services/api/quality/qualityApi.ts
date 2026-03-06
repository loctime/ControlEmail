import { apiClient } from "@/services/api/client"
import type { DailyConsistencyDTO, DailyMetricsDTO } from "@/services/api/quality/types"

export const qualityApi = {
  dailyMetrics: (date: string) => apiClient.get<DailyMetricsDTO>(`/api/email/daily-metrics?date=${date}`),
  dailyConsistency: (date: string) => apiClient.get<DailyConsistencyDTO>(`/api/email/daily-consistency?date=${date}`),
}
