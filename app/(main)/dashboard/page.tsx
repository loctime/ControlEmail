"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SuperDashboardPage from "./SuperDashboardPage"
import { authApi } from "@/services/api"

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void authApi
      .me()
      .then((me) => {
        if (cancelled) return
        if (me.role === "responsable") {
          router.replace("/historico")
          return
        }
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return <SuperDashboardPage />
}
