import { apiClient } from "@/services/api/client"
import type { DailyAlertDTO, DebugPendingAlertDTO, MarkAlertSentResultDTO } from "@/services/api/alerts/types"

export const alertsApi = {
  pendingDaily: () => apiClient.get<DailyAlertDTO[]>("/api/email/get-pending-daily-alerts"),
  markAlertSent: (plates: string[]) =>
    apiClient.post<MarkAlertSentResultDTO, { alertIds: string[] }>(
      "/api/email/mark-alert-sent",
      { alertIds: plates },
      { okStatuses: [207] },
    ),
  debugPending: () => apiClient.get<DebugPendingAlertDTO[]>("/api/email/debug-pending-alerts"),
}
