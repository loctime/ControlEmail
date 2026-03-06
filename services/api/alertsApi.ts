import type { DailyAlertDTO, MarkAlertSentResultDTO } from "@/services/dto"
import { sessionApiFetch } from "@/services/api/http"

export const alertsApi = {
  pendingDaily: () => sessionApiFetch<DailyAlertDTO[]>("/api/email/get-pending-daily-alerts"),
  markAlertSent: async (plates: string[]): Promise<MarkAlertSentResultDTO> => {
    const response = await fetch("/api/email/mark-alert-sent", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertIds: plates }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok && response.status !== 207) {
      throw new Error(data?.error || response.statusText || "Request failed")
    }
    return data as MarkAlertSentResultDTO
  },
}
