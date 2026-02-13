/**
 * Validación simple de sesión admin para /admin/vehicle-alerts.
 * Cookie httpOnly admin_alerts_session (valor fijo cuando el login es correcto).
 */

const COOKIE_NAME = "admin_alerts_session"
const COOKIE_VALUE = "ok"

export function getAdminSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (!match) return null
  return match[1]!.trim()
}

export function hasValidAdminSession(request: Request): boolean {
  const value = getAdminSessionCookie(request)
  return value === COOKIE_VALUE
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  })
}

/** Opciones para crear la cookie de sesión (8h, httpOnly, sameSite, secure en prod). */
export function buildAdminSessionCookieOptions(): {
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
    name: COOKIE_NAME,
    value: COOKIE_VALUE,
    options: {
      httpOnly: true,
      maxAge: 8 * 60 * 60, // 8 horas
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  }
}
