export interface AuthMeDTO {
  email: string
  uid: string
  role: "admin" | "general" | "report" | "responsable"
}

export interface AuthLogoutResponseDTO {
  ok: boolean
}

export interface CheckUserResponseDTO {
  allowed?: boolean
  authExists?: boolean
  error?: string
}

export interface CreateSessionRequestDTO {
  idToken: string
}

export interface CreateSessionResponseDTO {
  ok: boolean
}

export interface EmailMeDTO {
  ok: boolean
  email: string
  role: "admin" | "general" | "report" | "responsable"
}
