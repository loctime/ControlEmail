import type { DailyConsistencyDTO, DailyMetricsDTO } from "@/services/dto"
import { sessionApiFetch } from "@/services/api/http"

export const qualityApi = {
  dailyMetrics: (date: string) => sessionApiFetch<DailyMetricsDTO>(`/api/email/daily-metrics?date=${date}`),
  dailyConsistency: (date: string) => sessionApiFetch<DailyConsistencyDTO>(`/api/email/daily-consistency?date=${date}`),
}

