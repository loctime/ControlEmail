import type { VehicleDetailDTO } from "@/services/dto"

export interface VehicleDetailService {
  getVehicleDetail(vehicleId: string): Promise<VehicleDetailDTO>
}

class VehicleDetailServiceImpl implements VehicleDetailService {
  async getVehicleDetail(vehicleId: string): Promise<VehicleDetailDTO> {
    const response = await fetch(`/api/vehicle-detail/${encodeURIComponent(vehicleId)}`)
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }
}

export const vehicleDetailService: VehicleDetailService = new VehicleDetailServiceImpl()

