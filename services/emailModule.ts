import { alertsApi } from "@/services/api/alerts/alertsApi"
import { qualityApi } from "@/services/api/quality/qualityApi"
import type {
  DailyAlertDTO,
  DailyAlertMetaDTO,
  MarkAlertSentResultDTO,
} from "@/services/api/alerts/types"
import type { DailyConsistencyDTO, DailyMetricsDTO } from "@/services/api/quality/types"

export interface EmailModuleService {
  getDailyMetrics(date: string): Promise<DailyMetricsDTO>
  getPendingAlerts(): Promise<DailyAlertDTO[]>
  markAlertSent(alertIds: string[]): Promise<MarkAlertSentResultDTO>
  getDailyConsistency(date: string): Promise<DailyConsistencyDTO>
}

class EmailModuleServiceImpl implements EmailModuleService {
  async getDailyMetrics(date: string): Promise<DailyMetricsDTO> {
    return qualityApi.dailyMetrics(date)
  }

  async getPendingAlerts(): Promise<DailyAlertDTO[]> {
    return alertsApi.pendingDaily()
  }

  async markAlertSent(alertIds: string[]): Promise<MarkAlertSentResultDTO> {
    return alertsApi.markAlertSent(alertIds)
  }

  async getDailyConsistency(date: string): Promise<DailyConsistencyDTO> {
    return qualityApi.dailyConsistency(date)
  }
}

export const emailModuleService = new EmailModuleServiceImpl()

export type {
  DailyAlertDTO,
  DailyAlertMetaDTO,
  DailyMetricsDTO,
  DailyConsistencyDTO,
}
