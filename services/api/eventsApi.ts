import type { VehicleEventLegacyDTO } from "@/services/dto"
import { sessionApiFetch } from "@/services/api/http"

export const eventsApi = {
  listGlobal: () => sessionApiFetch<VehicleEventLegacyDTO[]>("/api/vehicle-events"),
}
