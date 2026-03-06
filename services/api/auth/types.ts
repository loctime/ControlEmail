export interface AuthMeDTO {
  email: string
  uid: string
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
