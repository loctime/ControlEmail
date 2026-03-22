import { apiClient } from "@/services/api/client"
import type { DaysBack, MyAlertsVehiclesDTO, MyVehiclesDTO, VehicleEventsParams, VehicleEventsResponse, VehiclePlateDetailDTO } from "@/services/api/vehicles/types"

export function getVehicleEventsHistory(params: { months: number; plate?: string }) {
  const qs = new URLSearchParams()
  qs.set("months", String(params.months))
  if (params.plate) qs.set("plate", params.plate)
  return apiClient.get<VehicleEventsResponse>(`/api/vehicles/events-history?${qs}`)
}

export const vehiclesApi = {
  myAlertsVehicles: () => apiClient.get<MyAlertsVehiclesDTO>("/api/email/my-alerts-vehicles"),
  myVehicles: () => apiClient.get<MyVehiclesDTO>("/api/email/my-vehicles"),
  vehicleDetailByPlate: (plate: string, daysBack: DaysBack) =>
    apiClient.get<VehiclePlateDetailDTO>(`/api/vehicles/${encodeURIComponent(plate)}?daysBack=${daysBack}`),
  vehicleEvents: (params: VehicleEventsParams) => {
    const qs = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo })
    if (params.plate) qs.set("plate", params.plate)
    if (params.eventType) qs.set("eventType", params.eventType)
    if (params.limit != null) qs.set("limit", String(params.limit))
    if (params.page != null) qs.set("page", String(params.page))
    return apiClient.get<VehicleEventsResponse>(`/api/vehicles/events?${qs}`)
  },
}
