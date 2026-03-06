"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { adminApi } from "@/services/api"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>()
  return emails.filter((e) => {
    const n = normalizeEmail(e)
    if (!n || seen.has(n)) return false
    seen.add(n)
    return true
  })
}

type SectionKey = "generalRecipients" | "ccRecipients" | "reportRecipients"

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "generalRecipients", title: "Destinatarios generales" },
  { key: "ccRecipients", title: "Copias (CC)" },
  { key: "reportRecipients", title: "Reportes tecnicos" },
]

export default function EmailConfigPage() {
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [generalRecipients, setGeneralRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [reportRecipients, setReportRecipients] = useState<string[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setFetchError(null)
      setNeedsLogin(false)
      try {
        const data = await adminApi.getEmailConfig()
        if (cancelled) return
        setGeneralRecipients(Array.isArray(data.generalRecipients) ? data.generalRecipients : [])
        setCcRecipients(Array.isArray(data.ccRecipients) ? data.ccRecipients : [])
        setReportRecipients(Array.isArray(data.reportRecipients) ? data.reportRecipients : [])
      } catch (err) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (status === 401) {
          setNeedsLogin(true)
        } else {
          setFetchError(err instanceof Error ? err.message : "Error al cargar")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      await adminApi.login({ password })
      window.location.reload()
    } catch (err) {
      const apiErr = err as { message?: string }
      const msg = apiErr?.message === "invalid_password" ? "Contrasena incorrecta" : apiErr?.message || "Error al ingresar"
      setLoginError(msg)
    } finally {
      setLoginLoading(false)
    }
  }

  const setList = (key: SectionKey, updater: (prev: string[]) => string[]) => {
    if (key === "generalRecipients") setGeneralRecipients(updater)
    else if (key === "ccRecipients") setCcRecipients(updater)
    else setReportRecipients(updater)
  }

  const getList = (key: SectionKey): string[] => {
    if (key === "generalRecipients") return generalRecipients
    if (key === "ccRecipients") return ccRecipients
    return reportRecipients
  }

  const handleEmailChange = (key: SectionKey, index: number, value: string) => {
    setList(key, (prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleAddEmail = (key: SectionKey) => {
    setList(key, (prev) => [...prev, ""])
  }

  const handleRemoveEmail = (key: SectionKey, index: number) => {
    setList(key, (prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveMessage(null)
    setSaving(true)
    const general = dedupeEmails(generalRecipients.map((e) => normalizeEmail(e)).filter(Boolean))
    const cc = dedupeEmails(ccRecipients.map((e) => normalizeEmail(e)).filter(Boolean))
    const report = dedupeEmails(reportRecipients.map((e) => normalizeEmail(e)).filter(Boolean))
    try {
      await adminApi.updateEmailConfig({
        generalRecipients: general,
        ccRecipients: cc,
        reportRecipients: report,
      })
      setSaveMessage("Configuracion guardada")
      setGeneralRecipients(general)
      setCcRecipients(cc)
      setReportRecipients(report)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (needsLogin) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-center text-xl font-semibold">Acceso administrador</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contrasena</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginLoading}
                className="w-full"
              />
            </div>
            {loginError && <p className="text-sm text-destructive">{loginError}</p>}
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracion de destinatarios de alertas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Destinatarios globales del sistema de alertas por email.</p>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      <div className="space-y-8">
        {SECTIONS.map(({ key, title }) => (
          <div key={key} className="rounded-md border bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">{title}</h2>
            <div className="space-y-2">
              {getList(key).map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={email}
                    onChange={(e) => handleEmailChange(key, index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar"
                    onClick={() => handleRemoveEmail(key, index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddEmail(key)}
                className="mt-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar email
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar configuracion"}
        </Button>
        {saveMessage && <p className="text-sm text-green-600 dark:text-green-400">{saveMessage}</p>}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
    </div>
  )
}
