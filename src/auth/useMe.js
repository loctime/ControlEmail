import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../firebase"
import { apiFetch } from "../api/client"

/**
 * Hook que espera al usuario Firebase, llama a GET /api/email/me y devuelve { email, role }.
 * Si el backend responde 403 con USER_NOT_AUTHORIZED, me = null y notAuthorized = true.
 * @returns {{ me: { email: string, role: string } | null, loading: boolean, notAuthorized: boolean }}
 */
export function useMe() {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMe(null)
        setLoading(false)
        setNotAuthorized(false)
        return
      }
      setLoading(true)
      setNotAuthorized(false)
      try {
        const data = await apiFetch("/api/email/me")
        setMe({ email: data.email, role: data.role })
      } catch (err) {
        if (err.status === 403 && err.code === "USER_NOT_AUTHORIZED") {
          setNotAuthorized(true)
          setMe(null)
        } else {
          setMe(null)
        }
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  return { me, loading, notAuthorized }
}
