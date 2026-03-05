"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * No hay pantalla de registro separada: el flujo de login en /login
 * maneja automáticamente login o creación de usuario (auth/user-not-found).
 */
export default function RegisterPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/login")
  }, [router])
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <p className="text-muted-foreground">Redirigiendo a inicio de sesión…</p>
    </div>
  )
}
