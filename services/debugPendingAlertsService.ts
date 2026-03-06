import { alertsApi } from "@/services/api/alerts/alertsApi"
import type { DebugPendingAlertDTO } from "@/services/api/alerts/types"

export interface DebugPendingAlertsService {
  listPending(): Promise<DebugPendingAlertDTO[]>
}

class DebugPendingAlertsServiceImpl implements DebugPendingAlertsService {
  async listPending(): Promise<DebugPendingAlertDTO[]> {
    return alertsApi.debugPending()
  }
}

export const debugPendingAlertsService: DebugPendingAlertsService =
  new DebugPendingAlertsServiceImpl()
