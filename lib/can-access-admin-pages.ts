import type { AuthMeDTO } from "@/services/api/auth/types"

/** Rutas /admin/*: acceso para usuarios ya autenticados con rol distinto de responsable. */
export function canAccessAdminPages(role: AuthMeDTO["role"]): boolean {
  return role !== "responsable"
}
