import { auth } from "@/lib/firebase-client"
import type {
  MeDTO,
  MyAlertsDTO,
  MyAlertsVehiclesDTO,
  MyRiskDTO,
  MyStatsDTO,
  MyVehiclesDTO,
} from "@/services/dto"

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

interface ApiFetchOptions extends RequestInit {
  headers?: HeadersInit
}

interface ApiError extends Error {
  status?: number
  code?: string
}

async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const user = auth.currentUser
  if (!user) {
    const err = new Error("Usuario no autenticado") as ApiError
    err.status = 401
    throw err
  }

  const token = await user.getIdToken()
  const baseUrl = getBaseUrl().replace(/\/$/, "")
  const path = url.startsWith("/") ? url : `/${url}`
  const fullUrl = `${baseUrl}${path}`

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const err = new Error(data?.error || data?.message || response.statusText || "Request failed") as ApiError
    err.status = response.status
    err.code = data?.code
    throw err
  }

  return data as T
}

export const emailFrontendApi = {
  me: () => apiFetch<MeDTO>("/api/email/me"),
  myVehicles: () => apiFetch<MyVehiclesDTO>("/api/email/my-vehicles"),
  myAlerts: (params?: { limit?: number; startAfter?: string }) => {
    const query = new URLSearchParams()
    if (params?.limit != null) query.set("limit", String(params.limit))
    if (params?.startAfter) query.set("startAfter", params.startAfter)
    const suffix = query.toString() ? `?${query.toString()}` : ""
    return apiFetch<MyAlertsDTO>(`/api/email/my-alerts${suffix}`)
  },
  myAlertsVehicles: () => apiFetch<MyAlertsVehiclesDTO>("/api/email/my-alerts-vehicles"),
  myStats: () => apiFetch<MyStatsDTO>("/api/email/my-stats"),
  myRisk: () => apiFetch<MyRiskDTO>("/api/email/my-risk"),
}
