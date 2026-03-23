"use client"

import { type ReactNode, useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { authApi } from "@/services/api"

const NAV_COLLAPSED_KEY = "nav:collapsed"

export function MainShell({ children }: { children: ReactNode }) {
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined)
  const [role, setRole] = useState<string | undefined>(undefined)
  const [email, setEmail] = useState<string | undefined>(undefined)
  const [navCollapsed, setNavCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(NAV_COLLAPSED_KEY) === "true") {
      setNavCollapsed(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setSubtitle(`Sesion: ${me.email}`)
        setRole(me.role)
        setEmail(me.email)
      })
      .catch(() => {
        if (!cancelled) setSubtitle(undefined)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function toggleNav() {
    setNavCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(NAV_COLLAPSED_KEY, String(next))
      return next
    })
  }

  const handleLogout = async () => {
    await authApi.logout()
    window.location.href = "/login"
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        role={role}
        email={email}
        collapsed={navCollapsed}
        onToggle={toggleNav}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar subtitle={subtitle} onLogout={handleLogout} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
