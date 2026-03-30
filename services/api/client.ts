import { auth } from "@/lib/firebase-client"
import { emailApiFetch, hybridSessionFirebaseFetch, sessionApiFetch } from "@/services/api/http"

export type ApiAuthMode = "session" | "firebase" | "hybrid"

export interface ApiClientError extends Error {
  status?: number
  code?: string
}

interface RequestConfig<TBody = unknown> {
  authMode?: ApiAuthMode
  headers?: HeadersInit
  okStatuses?: number[]
  body?: TBody
}

interface InternalRequestConfig<TBody = unknown> extends RequestConfig<TBody> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
}

function buildInit<TBody>(config: InternalRequestConfig<TBody>): RequestInit {
  const init: RequestInit = {
    method: config.method,
    headers: config.headers,
  }

  if (config.body !== undefined) {
    init.body = config.body instanceof FormData ? config.body : JSON.stringify(config.body)
  }

  return init
}

function jsonContentTypeIfNeeded(init: RequestInit): Record<string, string> {
  const hasJsonBody = init.body !== undefined && !(init.body instanceof FormData)
  return hasJsonBody ? { "Content-Type": "application/json" } : {}
}

async function fetchWithSession(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...jsonContentTypeIfNeeded(init),
      ...(init.headers ?? {}),
    },
  })
}

async function fetchWithFirebase(path: string, init: RequestInit): Promise<Response> {
  const user = auth.currentUser
  if (!user) {
    const err = new Error("Usuario no autenticado") as ApiClientError
    err.status = 401
    throw err
  }

  const token = await user.getIdToken()
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return fetch(`${baseUrl}${normalizedPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...jsonContentTypeIfNeeded(init),
      ...(init.headers ?? {}),
    },
  })
}

async function requestWithStatuses<TResponse, TBody = unknown>(
  path: string,
  config: InternalRequestConfig<TBody>,
): Promise<TResponse> {
  const authMode = config.authMode ?? "session"
  const init = buildInit(config)
  const response =
    authMode === "firebase"
      ? await fetchWithFirebase(path, init)
      : authMode === "hybrid"
        ? await hybridSessionFirebaseFetch(path, init)
        : await fetchWithSession(path, init)

  const data = (response.status === 204
    ? {}
    : await response.json().catch(() => ({}))) as TResponse & { error?: string; message?: string; code?: string }

  const allowedStatuses = new Set([200, 201, 202, 204, ...(config.okStatuses ?? [])])
  if (!allowedStatuses.has(response.status)) {
    const err = new Error(data.error ?? data.message ?? response.statusText ?? "Request failed") as ApiClientError
    err.status = response.status
    if (typeof data.code === "string") err.code = data.code
    throw err
  }

  return data
}

async function request<TResponse, TBody = unknown>(path: string, config: InternalRequestConfig<TBody>): Promise<TResponse> {
  if (config.okStatuses && config.okStatuses.length > 0) {
    return requestWithStatuses<TResponse, TBody>(path, config)
  }

  const init = buildInit(config)
  const authMode = config.authMode ?? "session"
  return authMode === "firebase"
    ? emailApiFetch<TResponse>(path, init)
    : authMode === "hybrid"
      ? hybridSessionFirebaseFetch<TResponse>(path, init)
      : sessionApiFetch<TResponse>(path, init)
}

export const apiClient = {
  get: <TResponse>(path: string, config: Omit<RequestConfig, "body"> = {}) =>
    request<TResponse>(path, { ...config, method: "GET" }),
  post: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    request<TResponse, TBody>(path, { ...config, method: "POST", body }),
  patch: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    request<TResponse, TBody>(path, { ...config, method: "PATCH", body }),
  put: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    request<TResponse, TBody>(path, { ...config, method: "PUT", body }),
  delete: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    request<TResponse, TBody>(path, { ...config, method: "DELETE", body }),
}
