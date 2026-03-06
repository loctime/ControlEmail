import { emailApiFetch, sessionApiFetch } from "@/services/api/http"

export type ApiAuthMode = "session" | "firebase"

export interface ApiClientError extends Error {
  status?: number
  code?: string
}

interface RequestConfig<TBody = unknown> {
  authMode?: ApiAuthMode
  body?: TBody
  headers?: HeadersInit
  okStatuses?: number[]
}

interface InternalRequestConfig<TBody = unknown> extends RequestConfig<TBody> {
  method: "GET" | "POST" | "PATCH" | "DELETE"
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

async function request<TResponse, TBody = unknown>(
  path: string,
  config: InternalRequestConfig<TBody>,
): Promise<TResponse> {
  const authMode = config.authMode ?? "session"
  const okStatuses = config.okStatuses

  if (!okStatuses || okStatuses.length === 0) {
    return authMode === "firebase"
      ? emailApiFetch<TResponse>(path, buildInit(config))
      : sessionApiFetch<TResponse>(path, buildInit(config))
  }

  const transport = authMode === "firebase" ? emailApiFetch<Response> : sessionApiFetch<Response>
  const response = await transport(path, {
    ...buildInit(config),
    // Force raw response for custom statuses.
    headers: {
      Accept: "application/json",
      ...(config.headers ?? {}),
    },
  })

  // The branch above is unreachable with current transports, keep fallback for typing safety.
  return response as unknown as TResponse
}

async function requestWithStatuses<TResponse, TBody = unknown>(
  path: string,
  config: InternalRequestConfig<TBody>,
): Promise<TResponse> {
  const authMode = config.authMode ?? "session"
  const init = buildInit(config)

  const rawResponse = authMode === "firebase"
    ? await fetchWithFirebase(path, init)
    : await fetchWithSession(path, init)

  const data = (rawResponse.status === 204
    ? {}
    : await rawResponse.json().catch(() => ({}))) as TResponse & { error?: string; message?: string; code?: string }

  const allowed = [200, 201, 202, 204, ...(config.okStatuses ?? [])]
  if (!allowed.includes(rawResponse.status)) {
    const err = new Error(
      data?.error ?? data?.message ?? rawResponse.statusText ?? "Request failed",
    ) as ApiClientError
    err.status = rawResponse.status
    err.code = data?.code
    throw err
  }

  return data
}

async function fetchWithSession(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  })
}

async function fetchWithFirebase(path: string, init: RequestInit): Promise<Response> {
  const { auth } = await import("@/lib/firebase-client")
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
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  })
}

export const apiClient = {
  get: <TResponse>(path: string, config: Omit<RequestConfig, "body"> = {}) =>
    config.okStatuses?.length
      ? requestWithStatuses<TResponse>(path, { ...config, method: "GET" })
      : request<TResponse>(path, { ...config, method: "GET" }),
  post: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    config.okStatuses?.length
      ? requestWithStatuses<TResponse, TBody>(path, { ...config, method: "POST", body })
      : request<TResponse, TBody>(path, { ...config, method: "POST", body }),
  patch: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    config.okStatuses?.length
      ? requestWithStatuses<TResponse, TBody>(path, { ...config, method: "PATCH", body })
      : request<TResponse, TBody>(path, { ...config, method: "PATCH", body }),
  delete: <TResponse, TBody = unknown>(path: string, body?: TBody, config: Omit<RequestConfig<TBody>, "body"> = {}) =>
    config.okStatuses?.length
      ? requestWithStatuses<TResponse, TBody>(path, { ...config, method: "DELETE", body })
      : request<TResponse, TBody>(path, { ...config, method: "DELETE", body }),
}
