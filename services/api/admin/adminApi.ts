import { apiClient } from "@/services/api/client"
import type {
  AdminLoginRequestDTO,
  AdminLoginResponseDTO,
  EmailConfigDTO,
  UpdateEmailConfigRequestDTO,
  UpdateEmailConfigResponseDTO,
} from "@/services/api/admin/types"

export const adminApi = {
  login: (payload: AdminLoginRequestDTO) =>
    apiClient.post<AdminLoginResponseDTO, AdminLoginRequestDTO>("/api/admin/login", payload),
  getEmailConfig: () => apiClient.get<EmailConfigDTO>("/api/admin/email-config"),
  updateEmailConfig: (payload: UpdateEmailConfigRequestDTO) =>
    apiClient.patch<UpdateEmailConfigResponseDTO, UpdateEmailConfigRequestDTO>("/api/admin/email-config", payload),
}
