"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { normalizePlate } from "@/lib/utils"
import { apiClient } from "@/services/api/client"
import { adminApi, authApi, sessionApiFetch } from "@/services/api"

const SIN_ASIGNAR_NOMBRE = "SIN_ASIGNAR"

type FleetOperation = {
  nombre: string
  plates: string[]
  responsables: string[]
}

function isFleetOperationRow(x: unknown): x is FleetOperation {
  if (x === null || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  return (
    typeof o.nombre === "string" &&
    Array.isArray(o.plates) &&
    o.plates.every((p) => typeof p === "string") &&
    Array.isArray(o.responsables) &&
    o.responsables.every((r) => typeof r === "string")
  )
}

function parseOperationsPayload(raw: unknown): FleetOperation[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isFleetOperationRow)
}

function operationsPath(nombre: string, suffix = "") {
  const base = `/api/admin/operations/${encodeURIComponent(nombre)}`
  return suffix ? `${base}${suffix}` : base
}

function emptySinAsignar(): FleetOperation {
  return { nombre: SIN_ASIGNAR_NOMBRE, plates: [], responsables: [] }
}

export default function OperationsAdminPage() {
  const [bootDone, setBootDone] = useState(false)
  const [sessionRequired, setSessionRequired] = useState(false)
  const [accessForbidden, setAccessForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [needsAdminLogin, setNeedsAdminLogin] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  const [operations, setOperations] = useState<FleetOperation[]>([])
  const [sinAsignar, setSinAsignar] = useState<FleetOperation>(emptySinAsignar)

  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createNombre, setCreateNombre] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [cardExpanded, setCardExpanded] = useState<Record<string, boolean>>({})
  const isCardExpanded = (nombre: string) => cardExpanded[nombre] !== false
  const setCardOpen = (nombre: string, open: boolean) => {
    setCardExpanded((p) => ({ ...p, [nombre]: open }))
  }

  const [sinAsignarOpen, setSinAsignarOpen] = useState(false)
  const [assigningPlate, setAssigningPlate] = useState<string | null>(null)

  const [plateDraft, setPlateDraft] = useState<Record<string, string>>({})
  const [plateAdding, setPlateAdding] = useState<Record<string, boolean>>({})
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({})
  const [emailAdding, setEmailAdding] = useState<Record<string, boolean>>({})

  const assignableOps = useMemo(
    () => [...operations].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [operations],
  )

  const applyPayload = useCallback((list: FleetOperation[]) => {
    const sin = list.find((o) => o.nombre === SIN_ASIGNAR_NOMBRE)
    const rest = list
      .filter((o) => o.nombre !== SIN_ASIGNAR_NOMBRE)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    setSinAsignar(sin ?? emptySinAsignar())
    setOperations(rest)
  }, [])

  const loadOperations = useCallback(async () => {
    setFetchError(null)
    setNeedsAdminLogin(false)
    try {
      const raw = await apiClient.get<unknown>("/api/admin/operations")
      applyPayload(parseOperationsPayload(raw))
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 401) {
        setNeedsAdminLogin(true)
      } else {
        setFetchError(err instanceof Error ? err.message : "Error al cargar operaciones")
      }
    }
  }, [applyPayload])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setSessionRequired(false)
      setAccessForbidden(false)
      try {
        const me = await authApi.me()
        if (cancelled) return
        if (me.role !== "admin") {
          setAccessForbidden(true)
          setLoading(false)
          setBootDone(true)
          return
        }
        await loadOperations()
      } catch (err) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (status === 401) {
          setSessionRequired(true)
        } else {
          setFetchError(err instanceof Error ? err.message : "Error al verificar acceso")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setBootDone(true)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [loadOperations])

  const showFlash = (msg: string) => {
    setFlashError(msg)
    window.setTimeout(() => setFlashError(null), 6000)
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      await adminApi.login({ password })
      setNeedsAdminLogin(false)
      setPassword("")
      await loadOperations()
    } catch (err) {
      const apiErr = err as { message?: string }
      const msg =
        apiErr?.message === "invalid_password" ? "Contrasena incorrecta" : apiErr?.message || "Error al ingresar"
      setLoginError(msg)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault()
    const nombre = createNombre.trim()
    if (!nombre) {
      setCreateError("Ingresa un nombre")
      return
    }
    setCreateError(null)
    setCreateLoading(true)
    try {
      await apiClient.post<unknown, { nombre: string; responsables: string[] }>("/api/admin/operations", {
        nombre,
        responsables: [],
      })
      setCreateOpen(false)
      setCreateNombre("")
      setOperations((prev) => {
        if (prev.some((o) => o.nombre === nombre)) return prev
        return [...prev, { nombre, plates: [], responsables: [] }].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        )
      })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo crear la operacion")
    } finally {
      setCreateLoading(false)
    }
  }

  const confirmDeleteOperation = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await apiClient.delete(operationsPath(deleteTarget))
      setOperations((prev) => prev.filter((o) => o.nombre !== deleteTarget))
      await loadOperations()
      setDeleteTarget(null)
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRemovePlate = async (nombre: string, plate: string) => {
    const normalized = normalizePlate(plate)
    try {
      await apiClient.delete(operationsPath(nombre, `/plates/${encodeURIComponent(normalized)}`))
      setOperations((prev) =>
        prev.map((o) =>
          o.nombre === nombre
            ? { ...o, plates: o.plates.filter((p) => normalizePlate(p) !== normalized) }
            : o,
        ),
      )
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Error al quitar patente")
    }
  }

  const handleAddPlate = async (nombre: string) => {
    const raw = plateDraft[nombre] ?? ""
    const normalized = normalizePlate(raw)
    if (!normalized) {
      showFlash("Patente invalida")
      return
    }
    try {
      await apiClient.post<unknown, { plate: string }>(operationsPath(nombre, "/plates"), { plate: normalized })
      setOperations((prev) =>
        prev.map((o) => {
          if (o.nombre !== nombre) return o
          if (o.plates.includes(normalized)) return o
          return { ...o, plates: [...o.plates, normalized] }
        }),
      )
      setPlateDraft((p) => ({ ...p, [nombre]: "" }))
      setPlateAdding((p) => ({ ...p, [nombre]: false }))
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Error al agregar patente")
    }
  }

  const handleRemoveResponsable = async (nombre: string, email: string) => {
    const op = operations.find((o) => o.nombre === nombre)
    if (!op) return
    const next = op.responsables.filter((r) => r !== email)
    try {
      await sessionApiFetch<unknown>(operationsPath(nombre), {
        method: "PUT",
        body: JSON.stringify({ responsables: next }),
      })
      setOperations((prev) => prev.map((o) => (o.nombre === nombre ? { ...o, responsables: next } : o)))
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Error al quitar responsable")
    }
  }

  const handleAddResponsable = async (nombre: string) => {
    const raw = (emailDraft[nombre] ?? "").trim()
    if (!raw.includes("@")) {
      showFlash("El email debe contener @")
      return
    }
    const op = operations.find((o) => o.nombre === nombre)
    if (!op) return
    if (op.responsables.includes(raw)) {
      setEmailDraft((p) => ({ ...p, [nombre]: "" }))
      setEmailAdding((p) => ({ ...p, [nombre]: false }))
      return
    }
    const next = [...op.responsables, raw]
    try {
      await sessionApiFetch<unknown>(operationsPath(nombre), {
        method: "PUT",
        body: JSON.stringify({ responsables: next }),
      })
      setOperations((prev) => prev.map((o) => (o.nombre === nombre ? { ...o, responsables: next } : o)))
      setEmailDraft((p) => ({ ...p, [nombre]: "" }))
      setEmailAdding((p) => ({ ...p, [nombre]: false }))
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Error al agregar responsable")
    }
  }

  const handleAssignFromSinAsignar = async (plate: string, targetNombre: string) => {
    const normalized = normalizePlate(plate)
    if (!targetNombre || !normalized) return
    setAssigningPlate(normalized)
    try {
      await apiClient.post<unknown, { plate: string }>(operationsPath(targetNombre, "/plates"), {
        plate: normalized,
      })
      setSinAsignar((prev) => ({
        ...prev,
        plates: prev.plates.filter((p) => normalizePlate(p) !== normalized && p !== plate),
      }))
      setOperations((prev) =>
        prev.map((o) => {
          if (o.nombre !== targetNombre) return o
          if (o.plates.includes(normalized)) return o
          return { ...o, plates: [...o.plates, normalized] }
        }),
      )
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Error al asignar patente")
    } finally {
      setAssigningPlate(null)
    }
  }

  if (!bootDone || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (sessionRequired) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold">Sesion requerida</h1>
        <p className="mt-2 text-sm text-muted-foreground">Inicia sesion para acceder a esta seccion.</p>
        <Button asChild className="mt-6">
          <Link href={`/login?next=${encodeURIComponent("/admin/operations")}`}>Ir al inicio de sesion</Link>
        </Button>
      </div>
    )
  }

  if (accessForbidden) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold">Acceso denegado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solo usuarios con rol administrador pueden ver esta pagina.</p>
      </div>
    )
  }

  if (needsAdminLogin) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-center text-xl font-semibold">Acceso administrador</h1>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password-ops">Contrasena</Label>
              <Input
                id="admin-password-ops"
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

  const sinCount = sinAsignar.plates.length

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Operaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de operaciones, patentes y responsables</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCreateError(null)
            setCreateOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva operación
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {fetchError}
        </div>
      )}
      {flashError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {flashError}
        </div>
      )}

      <div className="space-y-4">
        {operations.map((op) => {
          const pCount = op.plates.length
          const rCount = op.responsables.length
          const expanded = isCardExpanded(op.nombre)
          return (
            <Card key={op.nombre}>
              <Collapsible open={expanded} onOpenChange={(open) => setCardOpen(op.nombre, open)}>
                <CardHeader className="space-y-0 pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold leading-tight">{op.nombre}</h2>
                      <p className="text-xs text-muted-foreground">
                        {pCount} {pCount === 1 ? "patente" : "patentes"} · {rCount}{" "}
                        {rCount === 1 ? "responsable" : "responsables"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          {expanded ? "Ocultar" : "Editar"}
                        </Button>
                      </CollapsibleTrigger>
                      <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(op.nombre)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="border-t pt-4">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Patentes</h3>
                        <div className="flex flex-wrap gap-2">
                          {op.plates.map((plate) => (
                            <Badge key={plate} variant="secondary" className="gap-1 pr-1 font-mono">
                              {plate}
                              <button
                                type="button"
                                className="ml-1 rounded-full p-0.5 hover:bg-background/80"
                                aria-label={`Quitar patente ${plate}`}
                                onClick={() => void handleRemovePlate(op.nombre, plate)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        {plateAdding[op.nombre] ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              placeholder="Patente"
                              value={plateDraft[op.nombre] ?? ""}
                              onChange={(e) => setPlateDraft((p) => ({ ...p, [op.nombre]: e.target.value }))}
                              className="font-mono sm:max-w-[12rem]"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void handleAddPlate(op.nombre)
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={() => void handleAddPlate(op.nombre)}>
                                Guardar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPlateAdding((p) => ({ ...p, [op.nombre]: false }))}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPlateAdding((p) => ({ ...p, [op.nombre]: true }))}
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            agregar
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Responsables</h3>
                        <ul className="space-y-2">
                          {op.responsables.map((email) => (
                            <li
                              key={email}
                              className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm"
                            >
                              <span className="min-w-0 truncate">{email}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label={`Quitar ${email}`}
                                onClick={() => void handleRemoveResponsable(op.nombre, email)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                        {emailAdding[op.nombre] ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              type="email"
                              placeholder="email@ejemplo.com"
                              value={emailDraft[op.nombre] ?? ""}
                              onChange={(e) => setEmailDraft((p) => ({ ...p, [op.nombre]: e.target.value }))}
                              className="sm:max-w-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  void handleAddResponsable(op.nombre)
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={() => void handleAddResponsable(op.nombre)}>
                                Guardar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEmailAdding((p) => ({ ...p, [op.nombre]: false }))}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEmailAdding((p) => ({ ...p, [op.nombre]: true }))}
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            agregar email
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>

      <Collapsible open={sinAsignarOpen} onOpenChange={setSinAsignarOpen}>
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <h2 className="text-lg font-semibold">Sin asignar</h2>
                  <p className="text-xs text-muted-foreground">
                    {sinCount} {sinCount === 1 ? "patente detectada" : "patentes detectadas"} por el sistema
                  </p>
                </div>
                {sinAsignarOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="border-t pt-4">
              {sinCount === 0 ? (
                <p className="text-sm text-muted-foreground">No hay patentes sin asignar.</p>
              ) : (
                <ul className="space-y-3">
                  {sinAsignar.plates.map((plate) => (
                    <li
                      key={plate}
                      className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-mono text-sm font-medium">{plate}</span>
                      <div className="w-full sm:max-w-xs">
                        <Select
                          disabled={assigningPlate === normalizePlate(plate) || assignableOps.length === 0}
                          onValueChange={(value) => void handleAssignFromSinAsignar(plate, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={assignableOps.length === 0 ? "Sin operaciones" : "Asignar a operacion"} />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableOps.map((o) => (
                              <SelectItem key={o.nombre} value={o.nombre}>
                                {o.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateOperation}>
            <DialogHeader>
              <DialogTitle>Nueva operación</DialogTitle>
              <DialogDescription>Indica el nombre. Luego podrás agregar patentes y responsables en la tarjeta.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="new-op-nombre">Nombre</Label>
              <Input
                id="new-op-nombre"
                value={createNombre}
                onChange={(e) => setCreateNombre(e.target.value)}
                disabled={createLoading}
                autoComplete="off"
              />
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar operacion</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro? Las patentes pasaran a Sin Asignar
              {deleteTarget ? ` (“${deleteTarget}”).` : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteOperation()
              }}
            >
              {deleteLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
