"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/services/api"

type Step = "email" | "password" | "loading" | "error"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get("next") ?? "/"

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  /** Si ya existe en Firebase Auth (según el servidor). Evita depender de auth/user-not-found: a veces Firebase devuelve solo auth/invalid-credential. */
  const [firebaseUserExists, setFirebaseUserExists] = useState<boolean | null>(null)

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value) return

    setErrorMessage("")
    setStep("loading")

    try {
      const data = await authApi.checkUser(value)
      if (data?.allowed !== true) {
        setErrorMessage("Usuario no autorizado")
        setStep("error")
        return
      }

      setFirebaseUserExists(data.authExists === true)
      setStep("password")
      setPassword("")
    } catch (err) {
      const apiErr = err as { message?: string }
      setErrorMessage(apiErr?.message || "Error al verificar usuario")
      setStep("error")
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setErrorMessage("")
    setStep("loading")

    try {
      const trimmed = email.trim()
      let idToken: string

      if (firebaseUserExists === true) {
        const userCred = await signInWithEmailAndPassword(auth, trimmed, password)
        idToken = await userCred.user.getIdToken()
      } else {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, trimmed, password)
          idToken = await userCred.user.getIdToken()
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code
          if (code === "auth/email-already-in-use") {
            const userCred = await signInWithEmailAndPassword(auth, trimmed, password)
            idToken = await userCred.user.getIdToken()
          } else {
            throw err
          }
        }
      }

      await authApi.createSession({ idToken })

      router.push(nextUrl.startsWith("/") ? nextUrl : "/")
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al ingresar"
      setErrorMessage(msg)
      setStep("password")
    }
  }

  const backToEmail = () => {
    setErrorMessage("")
    setPassword("")
    setFirebaseUserExists(null)
    setStep("email")
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
        <div className="w-full max-w-sm space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">ControlDoc Vehicular</h1>
          <p className="text-sm text-muted-foreground">Verificando...</p>
        </div>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
        <div className="w-full max-w-sm space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">ControlDoc Vehicular</h1>
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
        </div>
        <div className="flex w-full max-w-sm gap-2">
          <Button variant="outline" className="flex-1" onClick={backToEmail}>
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (step === "password") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
        <div className="w-full max-w-sm space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">ControlDoc Vehicular</h1>
          <p className="text-sm text-muted-foreground">
            {firebaseUserExists
              ? `Ingresa tu contrasena para ${email}`
              : `Crea una contrasena para activar tu cuenta (${email})`}
          </p>
        </div>
        <form onSubmit={handleAuth} className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              autoComplete={firebaseUserExists ? "current-password" : "new-password"}
              autoFocus
            />
          </div>
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={backToEmail}>
              Atras
            </Button>
            <Button type="submit" className="flex-1">
              Ingresar
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">ControlDoc Vehicular</h1>
        <p className="text-sm text-muted-foreground">Ingresa tu email para continuar</p>
      </div>
      <form onSubmit={handleContinue} className="flex w-full max-w-sm flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoComplete="email"
          />
        </div>
        <Button type="submit">Continuar</Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
