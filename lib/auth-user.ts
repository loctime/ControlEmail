/**
 * Obtiene el usuario autenticado desde la request (cookie con ID token de Firebase)
 * y las patentes permitidas para ese usuario (responsables).
 */

import { verifyIdToken } from "@/lib/firebase-admin"
import { listVehicles } from "@/lib/firestore-read"

const AUTH_COOKIE_NAME = "auth_token"

export interface AuthUser {
  email: string
  uid: string
}

/**
 * Lee el ID token desde la cookie auth_token y lo verifica.
 * Devuelve el usuario (email, uid) o null si no hay cookie o el token es inválido.
 */
export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
  const token = match?.[1]?.trim()
  if (!token) return null

  try {
    const decoded = await verifyIdToken(token)
    const email = decoded.email
    if (!email) return null
    return { email, uid: decoded.uid }
  } catch {
    return null
  }
}

/**
 * Devuelve el conjunto de patentes (plates) para las que el email está en responsables.
 * Se usa para filtrar todos los datos de la app por usuario.
 */
export async function getAllowedPlatesForEmail(email: string): Promise<Set<string>> {
  const vehicles = await listVehicles()
  const normalizedEmail = email.trim().toLowerCase()
  const plates = vehicles
    .filter((v) =>
      (v.responsables ?? []).some((r) => String(r).trim().toLowerCase() === normalizedEmail)
    )
    .map((v) => v.plate)
  return new Set(plates)
}

export interface AuthUserWithPlates extends AuthUser {
  allowedPlates: Set<string>
}

/**
 * Obtiene el usuario autenticado y el set de patentes permitidas.
 * Devuelve null si no hay usuario (el llamador debe responder 401).
 */
export async function getAuthUserWithPlates(request: Request): Promise<AuthUserWithPlates | null> {
  const user = await getAuthUserFromRequest(request)
  if (!user) return null
  const allowedPlates = await getAllowedPlatesForEmail(user.email)
  return { ...user, allowedPlates }
}

/** Respuesta 401 estándar para APIs que requieren login. */
export function authUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  })
}

/** Opciones para la cookie de sesión (1h, httpOnly, sameSite, secure en prod). */
export function buildAuthCookieOptions(token: string): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    maxAge: number
    path: string
    sameSite: "strict"
    secure: boolean
  }
} {
  return {
    name: AUTH_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      maxAge: 60 * 60, // 1 hora (el ID token de Firebase expira en ~1h)
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  }
}

export { AUTH_COOKIE_NAME }
