"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth"
import { auth } from "@/lib/firebase-client"
import { authApi } from "@/services/api"

const PUBLIC_PATHS = ["/login", "/register", "/panel"]
const ADMIN_PATH_PREFIX = "/admin"

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // Renueva el cookie auth_token cada vez que Firebase refresca el ID token (~cada 55 min).
  // Sin esto, después de 1h el cookie queda con el token expirado y el backend devuelve 401.
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) return
      try {
        const idToken = await user.getIdToken()
        await authApi.createSession({ idToken })
      } catch {
        // Si falla silenciosamente, el check de authApi.me() redirige al login
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setChecked(true)
      return
    }
    if (isAdminPath(pathname)) {
      setChecked(true)
      return
    }

    let cancelled = false

    // /api/auth/me solo valida cookie auth_token. Hay que asegurar createSession
    // antes del primer me() o aparece 401 (carrera con onIdTokenChanged).
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`)
        return
      }
      try {
        const idToken = await user.getIdToken()
        await authApi.createSession({ idToken })
        await authApi.me()
        if (!cancelled) setChecked(true)
      } catch (err) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (status === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`)
          return
        }
        router.replace("/login")
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [pathname, router])

  if (isPublicPath(pathname) || isAdminPath(pathname)) {
    return <>{children}</>
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Verificando sesion...</p>
      </div>
    )
  }

  return <>{children}</>
}
