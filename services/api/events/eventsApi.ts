import { apiClient } from "@/services/api/client"
import type { VehicleEventLegacyDTO } from "@/services/api/events/types"

export const eventsApi = {
  listGlobal: () => apiClient.get<VehicleEventLegacyDTO[]>("/api/vehicle-events"),
}
