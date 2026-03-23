"use client"

import { type ReactNode, useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { authApi } from "@/services/api"

export function MainShell({ children }: { children: ReactNode }) {
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined)
  const [role, setRole] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setSubtitle(`Sesion: ${me.email}`)
        setRole(me.role)
      })
      .catch(() => {
        if (!cancelled) setSubtitle(undefined)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    await authApi.logout()
    window.location.href = "/login"
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar subtitle={subtitle} onLogout={handleLogout} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
