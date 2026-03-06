"use client"

import { type ReactNode, useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { authApi, dashboardApi } from "@/services/api"

export function MainShell({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0)
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    dashboardApi
      .myAlerts({ limit: 200 })
      .then((data) => {
        if (cancelled) return
        const pending = (data.alerts ?? []).filter((item) => !item.alertSent).length
        setPendingCount(pending)
      })
      .catch(() => {
        if (!cancelled) setPendingCount(0)
      })

    authApi
      .me()
      .then((me) => {
        if (!cancelled) setSubtitle(`Sesion: ${me.email}`)
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
      <AppSidebar pendingAlertsCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar subtitle={subtitle} onLogout={handleLogout} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

