import { apiClient } from "@/services/api/client"
import type {
  AuthLogoutResponseDTO,
  AuthMeDTO,
  CheckUserResponseDTO,
  CreateSessionRequestDTO,
  CreateSessionResponseDTO,
} from "@/services/api/auth/types"

export const authApi = {
  me: () => apiClient.get<AuthMeDTO>("/api/auth/me"),
  logout: () => apiClient.post<AuthLogoutResponseDTO>("/api/auth/logout"),
  checkUser: (email: string) =>
    apiClient.get<CheckUserResponseDTO>(`/api/auth/check-user?email=${encodeURIComponent(email)}`),
  createSession: (payload: CreateSessionRequestDTO) =>
    apiClient.post<CreateSessionResponseDTO, CreateSessionRequestDTO>("/api/auth/session", payload),
}
