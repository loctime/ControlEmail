"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { auth } from "../firebase"

/**
 * Si no hay usuario Firebase, redirige a /login.
 * Los hijos solo se renderizan cuando hay usuario.
 */
export function RequireAuth({ children }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [hasUser, setHasUser] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setHasUser(!!user)
      setReady(true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!hasUser) {
      router.replace("/panel/login")
    }
  }, [ready, hasUser, router])

  if (!ready || !hasUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return children
}
