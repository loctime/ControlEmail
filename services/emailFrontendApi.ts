import { apiClient } from "@/services/api/client"
import type { MeDTO } from "@/services/dto"
import type { MyAlertsDTO, MyRiskDTO, MyStatsDTO } from "@/services/api/dashboard/types"
import type { MyAlertsVehiclesDTO, MyVehiclesDTO } from "@/services/api/vehicles/types"

export const emailFrontendApi = {
  me: () => apiClient.get<MeDTO>("/api/email/me", { authMode: "firebase" }),
  myVehicles: () => apiClient.get<MyVehiclesDTO>("/api/email/my-vehicles", { authMode: "firebase" }),
  myAlerts: (params?: { limit?: number; startAfter?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.startAfter) query.set("startAfter", params.startAfter)
    const suffix = query.toString() ? `?${query.toString()}` : ""
    return apiClient.get<MyAlertsDTO>(`/api/email/my-alerts${suffix}`, { authMode: "firebase" })
  },
  myAlertsVehicles: () => apiClient.get<MyAlertsVehiclesDTO>("/api/email/my-alerts-vehicles", { authMode: "firebase" }),
  myStats: () => apiClient.get<MyStatsDTO>("/api/email/my-stats", { authMode: "firebase" }),
  myRisk: () => apiClient.get<MyRiskDTO>("/api/email/my-risk", { authMode: "firebase" }),
}
