"use client"

import { usePathname } from "next/navigation"
import { RequireAuth } from "./auth/RequireAuth"
import LoginPage from "./views/LoginPage"
import RegisterPage from "./views/RegisterPage"
import Dashboard from "./views/Dashboard"

const LEGACY_PANEL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LEGACY_PANEL === "true"

export default function App() {
  const pathname = usePathname() || ""

  if (!LEGACY_PANEL_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Panel legacy desactivado</h1>
          <p className="text-sm text-muted-foreground">Usa las rutas principales de la aplicacion.</p>
        </div>
      </div>
    )
  }

  if (pathname.endsWith("/login")) {
    return <LoginPage />
  }
  if (pathname.endsWith("/register")) {
    return <RegisterPage />
  }
  if (pathname.endsWith("/dashboard") || pathname.endsWith("/panel") || pathname === "/panel") {
    return (
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  )
}
