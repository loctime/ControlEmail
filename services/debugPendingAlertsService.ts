import type { DebugPendingAlertDTO } from "@/services/dto"

export interface DebugPendingAlertsService {
  listPending(): Promise<DebugPendingAlertDTO[]>
}

class DebugPendingAlertsServiceImpl implements DebugPendingAlertsService {
  async listPending(): Promise<DebugPendingAlertDTO[]> {
    const response = await fetch("/api/email/debug-pending-alerts", {
      credentials: "include",
    })
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }
}

export const debugPendingAlertsService: DebugPendingAlertsService =
  new DebugPendingAlertsServiceImpl()

