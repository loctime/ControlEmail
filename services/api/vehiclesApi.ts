import type { MyAlertsVehiclesDTO, MyVehiclesDTO, VehiclePlateDetailDTO } from "@/services/dto"
import { sessionApiFetch } from "@/services/api/http"

export const vehiclesApi = {
  myAlertsVehicles: () => sessionApiFetch<MyAlertsVehiclesDTO>("/api/email/my-alerts-vehicles"),
  myVehicles: () => sessionApiFetch<MyVehiclesDTO>("/api/email/my-vehicles"),
  vehicleDetailByPlate: (plate: string, daysBack: 7 | 30 | 90) =>
    sessionApiFetch<VehiclePlateDetailDTO>(`/api/vehicles/${encodeURIComponent(plate)}?daysBack=${daysBack}`),
}

