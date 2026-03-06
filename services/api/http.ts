import { auth } from "@/lib/firebase-client"

interface ApiError extends Error {
  status?: number
  code?: string
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

export async function emailApiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
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

export async function sessionApiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
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
