// LEGACY ONLY: usado exclusivamente por /panel`r`nimport { auth } from "../firebase"

const getBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  return process.env.NEXT_PUBLIC_API_URL || ""
}

/**
 * @param {string} url - Ruta relativa (ej: "/api/email/me")
 * @param {RequestInit} [options] - Opciones de fetch
 * @returns {Promise<any>} - JSON parseado
 */
export async function apiFetch(url, options = {}) {
  const user = auth.currentUser
  if (!user) {
    throw new Error("Usuario no autenticado")
  }
  const token = await user.getIdToken()
  const baseUrl = getBaseUrl().replace(/\/$/, "")
  const path = url.startsWith("/") ? url : `/${url}`
  const fullUrl = `${baseUrl}${path}`

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || "Error en la petición")
    err.status = res.status
    err.code = data?.code
    throw err
  }
  return data
}

