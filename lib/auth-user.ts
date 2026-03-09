/**
 * Obtiene el usuario autenticado desde la request (cookie con ID token de Firebase)
 * y las patentes permitidas para ese usuario según su rol:
 * - admin, general, report: todas las patentes del sistema.
 * - responsable: solo patentes donde el usuario está en responsables.
 */

import { verifyIdToken, getFirebaseAuth } from "@/lib/firebase-admin"
import { listVehicles, allowedUserExistsByEmail, getEmailAccessUserByEmail } from "@/lib/firestore-read"

export interface CheckUserResult {
  allowed: boolean
  authExists: boolean
}

/**
 * Comprueba si un email esta autorizado (existe en apps/emails/users/{email})
 * y si ya existe un usuario de Firebase Auth con ese email.
 * No crea usuario en Auth; la creacion la hace el frontend con createUserWithEmailAndPassword.
 */
export async function checkUserByEmail(email: string): Promise<CheckUserResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { allowed: false, authExists: false }

  const allowed = await allowedUserExistsByEmail(normalized)
  if (!allowed) return { allowed: false, authExists: false }

  let authExists = false
  try {
    await getFirebaseAuth().getUserByEmail(normalized)
    authExists = true
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === "auth/user-not-found") authExists = false
    else throw err
  }

  return { allowed: true, authExists }
}

const AUTH_COOKIE_NAME = "auth_token"

export interface AuthUser {
  email: string
  uid: string
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization")
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function extractCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))
  return match?.[1]?.trim() ?? null
}

/**
 * Lee el ID token desde Authorization Bearer o cookie auth_token y lo verifica.
 * Devuelve el usuario (email, uid) o null si falta token o es invalido.
 */
export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  const token = extractBearerToken(request) ?? extractCookieToken(request)
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

const ROLES_WITH_ALL_PLATES = ["admin", "general", "report"] as const

/**
 * Devuelve el conjunto de patentes (plates) para las que el email está en responsables.
 * Se usa cuando el rol es "responsable".
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

/**
 * Devuelve el conjunto de todas las patentes del sistema (desde listVehicles).
 * Usado para roles admin, general y report.
 */
async function getAllPlates(): Promise<Set<string>> {
  const vehicles = await listVehicles()
  const plates = vehicles.map((v) => v.plate ?? v.id).filter(Boolean)
  return new Set(plates)
}

export interface AuthUserWithPlates extends AuthUser {
  allowedPlates: Set<string>
}

/**
 * Obtiene el usuario autenticado y el set de patentes permitidas según su rol.
 * - admin, general, report: allowedPlates = todas las patentes del sistema.
 * - responsable (o sin acceso en apps/emails/access): allowedPlates = solo patentes donde está en responsables.
 * Devuelve null si no hay usuario o si falla la verificacion/consulta (el llamador debe responder 401).
 * No lanza: ante cualquier error devuelve null para evitar 500.
 */
export async function getAuthUserWithPlates(request: Request): Promise<AuthUserWithPlates | null> {
  try {
    const user = await getAuthUserFromRequest(request)
    if (!user) return null

    const accessUser = await getEmailAccessUserByEmail(user.email)
    const role = accessUser?.role ?? "responsable"

    const allowedPlates =
      ROLES_WITH_ALL_PLATES.includes(role as (typeof ROLES_WITH_ALL_PLATES)[number])
        ? await getAllPlates()
        : await getAllowedPlatesForEmail(user.email)

    return { ...user, allowedPlates }
  } catch (err) {
    console.error("[auth-user] getAuthUserWithPlates error:", err)
    return null
  }
}

/** Respuesta 401 estandar para APIs que requieren login. */
export function authUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  })
}

/** Opciones para la cookie de sesion (1h, httpOnly, sameSite, secure en prod). */
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
