import { apiClient } from "@/services/api/client"
import type { DaysBack, MyAlertsVehiclesDTO, MyVehiclesDTO, VehiclePlateDetailDTO } from "@/services/api/vehicles/types"

export const vehiclesApi = {
  myAlertsVehicles: () => apiClient.get<MyAlertsVehiclesDTO>("/api/email/my-alerts-vehicles"),
  myVehicles: () => apiClient.get<MyVehiclesDTO>("/api/email/my-vehicles"),
  vehicleDetailByPlate: (plate: string, daysBack: DaysBack) =>
    apiClient.get<VehiclePlateDetailDTO>(`/api/vehicles/${encodeURIComponent(plate)}?daysBack=${daysBack}`),
}
