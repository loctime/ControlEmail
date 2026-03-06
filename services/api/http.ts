import { auth } from "@/lib/firebase-client"

export interface ApiError extends Error {
  status?: number
  code?: string
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

function withBaseUrl(url: string): string {
  const baseUrl = getBaseUrl().replace(/\/$/, "")
  const path = url.startsWith("/") ? url : `/${url}`
  return `${baseUrl}${path}`
}

async function parseResponseData<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T
  }
  return (await response.json().catch(() => ({}))) as T
}

function buildApiError(response: Response, data: unknown): ApiError {
  const payload = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}
  const err = new Error(
    String(payload.error ?? payload.message ?? response.statusText ?? "Request failed"),
  ) as ApiError
  err.status = response.status
  if (typeof payload.code === "string") {
    err.code = payload.code
  }
  return err
}

export async function emailApiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const user = auth.currentUser
  if (!user) {
    const err = new Error("Usuario no autenticado") as ApiError
    err.status = 401
    throw err
  }

  const token = await user.getIdToken()
  const fullUrl = withBaseUrl(url)

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(options.headers ?? {}),
  }

  if (!(options.body instanceof FormData) && !(headers as Record<string, string>)["Content-Type"]) {
    ;(headers as Record<string, string>)["Content-Type"] = "application/json"
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  })

  const data = await parseResponseData<T>(response)

  if (!response.ok) {
    throw buildApiError(response, data)
  }

  return data
}

export async function sessionApiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    ...(options.headers ?? {}),
  }

  if (!(options.body instanceof FormData) && !(headers as Record<string, string>)["Content-Type"]) {
    ;(headers as Record<string, string>)["Content-Type"] = "application/json"
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  })

  const data = await parseResponseData<T>(response)

  if (!response.ok) {
    throw buildApiError(response, data)
  }

  return data
}
