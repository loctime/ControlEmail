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
