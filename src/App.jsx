"use client"

import { usePathname } from "next/navigation"
import { RequireAuth } from "./auth/RequireAuth"
import LoginPage from "./views/LoginPage"
import RegisterPage from "./views/RegisterPage"
import Dashboard from "./views/Dashboard"

/**
 * Router: /panel/login, /panel/register, /panel/dashboard
 * Dashboard protegido con RequireAuth.
 */
export default function App() {
  const pathname = usePathname() || ""

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

  // Por defecto redirigir al dashboard (RequireAuth redirige a login si no hay usuario)
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  )
}
