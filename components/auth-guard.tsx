"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

const PUBLIC_PATHS = ["/login", "/register"]
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
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (cancelled) return
        if (res.status === 401) {
          const toLogin = `/login?next=${encodeURIComponent(pathname)}`
          router.replace(toLogin)
          return
        }
        setChecked(true)
      })
      .catch(() => {
        if (!cancelled) router.replace("/login")
      })

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (isPublicPath(pathname) || isAdminPath(pathname)) {
    return <>{children}</>
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Verificando sesión…</p>
      </div>
    )
  }

  return <>{children}</>
}
