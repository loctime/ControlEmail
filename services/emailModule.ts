import type {
  DailyAlertDTO,
  DailyAlertMetaDTO,
  DailyMetricsDTO,
  DailyConsistencyDTO,
  MarkAlertSentResultDTO,
} from "@/services/dto"

export interface EmailModuleService {
  getDailyMetrics(date: string): Promise<DailyMetricsDTO>
  getPendingAlerts(): Promise<DailyAlertDTO[]>
  markAlertSent(alertIds: string[]): Promise<MarkAlertSentResultDTO>
  getDailyConsistency(date: string): Promise<DailyConsistencyDTO>
}

class EmailModuleServiceImpl implements EmailModuleService {
  async getDailyMetrics(date: string): Promise<DailyMetricsDTO> {
    const response = await fetch(`/api/email/daily-metrics?date=${date}`, { credentials: "include" })
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }

  async getPendingAlerts(): Promise<DailyAlertDTO[]> {
    const response = await fetch("/api/email/get-pending-daily-alerts", { credentials: "include" })
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }

  async markAlertSent(alertIds: string[]): Promise<MarkAlertSentResultDTO> {
    const response = await fetch("/api/email/mark-alert-sent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ alertIds }),
    })
    if (!response.ok && response.status !== 207) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }

  async getDailyConsistency(date: string): Promise<DailyConsistencyDTO> {
    const response = await fetch(`/api/email/daily-consistency?date=${date}`, { credentials: "include" })
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }
}

export const emailModuleService = new EmailModuleServiceImpl()

// Types para uso en componentes (reexportados desde DTOs de dominio)
export type {
  DailyAlertDTO,
  DailyAlertMetaDTO,
  DailyMetricsDTO,
  DailyConsistencyDTO,
}
