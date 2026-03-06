import { sessionApiFetch } from "@/services/api/http"

export interface AuthMeDTO {
  email: string
  uid: string
}

export const authApi = {
  me: () => sessionApiFetch<AuthMeDTO>("/api/auth/me"),
  logout: () => sessionApiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
}
