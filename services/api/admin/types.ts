export interface AdminLoginRequestDTO {
  password: string
}

export interface AdminLoginResponseDTO {
  ok: boolean
}

export interface EmailConfigDTO {
  generalRecipients: string[]
  ccRecipients: string[]
  reportRecipients: string[]
}

export interface UpdateEmailConfigRequestDTO extends EmailConfigDTO {}

export interface UpdateEmailConfigResponseDTO {
  ok: boolean
}

export interface VehicleAlertRowDTO {
  id: string
  plate: string
  brand?: string
  model?: string
  responsables: string[]
}

export type VehicleAlertsResponseDTO = VehicleAlertRowDTO[]

export interface UpdateVehicleAlertsRequestDTO {
  vehicles: Array<{ plate: string; responsables: string[] }>
}

export interface UpdateVehicleAlertsResponseDTO {
  ok: boolean
  vehiclesUpdated: number
}
