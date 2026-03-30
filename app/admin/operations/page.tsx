"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { canAccessAdminPages } from "@/lib/can-access-admin-pages"
import { normalizePlate } from "@/lib/utils"
import { apiClient } from "@/services/api/client"
import { authApi } from "@/services/api"

const SIN_ASIGNAR_NOMBRE = "SIN_ASIGNAR"

/** Filtrá la consola por este texto para depurar carga y filtros. */
const OPS_LOG = "[OperacionesAdmin]"

function summarizeOperationsResponse(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) return { forma: "null_o_undefined" }
  if (Array.isArray(raw)) {
    const first = raw[0]
    return {
      forma: "array_raiz",
      length: raw.length,
      primerElemento:
        first !== null && typeof first === "object"
          ? Object.keys(first as object)
          : typeof first,
    }
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>
    const keys = Object.keys(o)
    const nested = (k: string) => (Array.isArray(o[k]) ? (o[k] as unknown[]).length : null)
    return {
      forma: "object",
      keys,
      longitudes: {
        operations: nested("operations"),
        data: nested("data"),
        items: nested("items"),
        results: nested("results"),
      },
    }
  }
  return { forma: typeof raw }
}

type FleetOperation = {
  nombre: string
  plates: string[]
  responsables: string[]
}

/** El backend a veces manda patentes o mails como objeto o número; antes el guard estricto descartaba toda la fila. */
function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  if (typeof v === "object") {
    const r = v as Record<string, unknown>
    const pick =
      r.plate ??
      r.patente ??
      r.email ??
      r.mail ??
      r.value ??
      r.id ??
      r.nombre
    if (typeof pick === "string") return pick.trim()
    if (typeof pick === "number" && Number.isFinite(pick)) return String(pick)
  }
  return ""
}

function normalizeFleetOperation(x: unknown): FleetOperation | null {
  if (x === null || typeof x !== "object") return null
  const o = x as Record<string, unknown>
  if (typeof o.nombre !== "string" || !o.nombre.trim()) return null
  const platesRaw = Array.isArray(o.plates) ? o.plates : []
  const responsablesRaw = Array.isArray(o.responsables) ? o.responsables : []
  const plates = platesRaw.map(cellToString).filter(Boolean)
  const responsables = responsablesRaw.map(cellToString).filter(Boolean)
  return { nombre: o.nombre.trim(), plates, responsables }
}

function parseOperationsPayload(raw: unknown): FleetOperation[] {
  let list: unknown[] = []
  let nestedKey: string | null = null
  if (Array.isArray(raw)) {
    list = raw
  } else if (raw !== null && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    for (const key of ["operations", "data", "items", "results"] as const) {
      const v = o[key]
      if (Array.isArray(v)) {
        nestedKey = key
        list = v
        break
      }
    }
  }
  const valid = list.map(normalizeFleetOperation).filter((r): r is FleetOperation => r !== null)
  if (list.length > 0 && valid.length === 0) {
    const first = list[0]
    console.warn(OPS_LOG, "Hay candidatos pero ninguna fila se pudo normalizar (revisá nombre / plates[] / responsables[]).", {
      candidatos: list.length,
      muestraPrimerElemento: first,
      claveAnidadaUsada: nestedKey,
    })
  }
  return valid
}

function operationsPath(nombre: string, suffix = "") {
  const base = `/api/admin/operations/${encodeURIComponent(nombre)}`
  return suffix ? `${base}${suffix}` : base
}

function emptySinAsignar(): FleetOperation {
  return { nombre: SIN_ASIGNAR_NOMBRE, plates: [], responsables: [] }
}

/** Cookie auth_token + Bearer de Firebase si hay currentUser (proxy local reenvía a controlfile). */
const OPS_AUTH = { authMode: "hybrid" as const }

export default function OperationsAdminPage() {
  const [bootDone, setBootDone] = useState(false)
  const [sessionRequired, setSessionRequired] = useState(false)
  const [accessForbidden, setAccessForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)

  const [operations, setOperations] = useState<FleetOperation[]>([])
  const [sinAsignar, setSinAsignar] = useState<FleetOperation>(emptySinAsignar)

  const [createOpen, setCreateOpen] = useState(false)
  const [createNombre, setCreateNombre] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [cardExpanded, setCardExpanded] = useState<Record<string, boolean>>({})
  const isCardExpanded = (nombre: string) => cardExpanded[nombre] === true
  const setCardOpen = (nombre: string, open: boolean) => {
    setCardExpanded((p) => ({ ...p, [nombre]: open }))
  }

  const [searchText, setSearchText] = useState("")
  const [activeChips, setActiveChips] = useState<Set<string>>(() => new Set())
  const [sortBy, setSortBy] = useState<"nombre" | "patentes" | "responsables">("nombre")
  const [allExpanded, setAllExpanded] = useState(false)
  const prevOperationNamesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const newNames = new Set(operations.map((o) => o.nombre))
    const prevNamesSnapshot = new Set(prevOperationNamesRef.current)
    setActiveChips((prev) => {
      const next = new Set<string>()
      for (const n of prev) {
        if (newNames.has(n)) next.add(n)
      }
      for (const n of newNames) {
        if (!prevNamesSnapshot.has(n)) next.add(n)
      }
      return next
    })
    prevOperationNamesRef.current = newNames
  }, [operations])

  const [sinAsignarOpen, setSinAsignarOpen] = useState(false)
  const [assigningPlate, setAssigningPlate] = useState<string | null>(null)

  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({})
  const [emailAdding, setEmailAdding] = useState<Record<string, boolean>>({})

  const assignableOps = useMemo(
    () => [...operations].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [operations],
  )

  const totalPlatesAllOps = useMemo(
    () => operations.reduce((sum, o) => sum + o.plates.length, 0),
    [operations],
  )

  const visibleOperations = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    let list = operations.filter((op) => activeChips.has(op.nombre))
    if (q) {
      list = list.filter((op) => {
        if (op.nombre.toLowerCase().includes(q)) return true
        if (op.plates.some((p) => p.toLowerCase().includes(q))) return true
        if (op.responsables.some((r) => r.toLowerCase().includes(q))) return true
        return false
      })
    }
    const sorted = [...list]
    if (sortBy === "nombre") {
      sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    } else if (sortBy === "patentes") {
      sorted.sort(
        (a, b) =>
          b.plates.length - a.plates.length || a.nombre.localeCompare(b.nombre, "es"),
      )
    } else {
      sorted.sort(
        (a, b) =>
          b.responsables.length - a.responsables.length ||
          a.nombre.localeCompare(b.nombre, "es"),
      )
    }
    return sorted
  }, [operations, activeChips, searchText, sortBy])

  const chipOpsOrdered = useMemo(
    () => [...operations].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [operations],
  )

  useEffect(() => {
    const visiblesPorChip = operations.filter((op) => activeChips.has(op.nombre)).length
    console.info(OPS_LOG, "Estado filtros UI (chips + búsqueda).", {
      operacionesEnMemoria: operations.length,
      chipsActivos: activeChips.size,
      nombresEnChipsActivos: [...activeChips],
      operacionesQuePasarianSoloChip: visiblesPorChip,
      visiblesTrasBusquedaYOrden: visibleOperations.length,
      textoBusqueda: searchText.trim() || "(vacío)",
      nota:
        operations.length > 0 && activeChips.size === 0
          ? "Ningún chip activo: lista visible vacía. Probá «Todas»."
          : undefined,
    })
  }, [operations, activeChips, visibleOperations, searchText])

  const applyPayload = useCallback((list: FleetOperation[]) => {
    const sin = list.find((o) => o.nombre === SIN_ASIGNAR_NOMBRE)
    const rest = list
      .filter((o) => o.nombre !== SIN_ASIGNAR_NOMBRE)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    setSinAsignar(sin ?? emptySinAsignar())
    setOperations(rest)
    console.info(OPS_LOG, "Payload aplicado al estado.", {
      operacionesSinSinAsignar: rest.length,
      nombresOperaciones: rest.map((o) => o.nombre),
      patentesSinAsignar: sin?.plates?.length ?? 0,
      totalPatentesEnOperaciones: rest.reduce((n, o) => n + o.plates.length, 0),
    })
  }, [])

  const loadOperations = useCallback(async () => {
    setFetchError(null)
    const t0 = typeof performance !== "undefined" ? performance.now() : 0
    console.info(OPS_LOG, "Inicio GET /api/admin/operations (auth: hybrid = cookie + Firebase si hay sesión SDK).")
    try {
      const raw = await apiClient.get<unknown>("/api/admin/operations", OPS_AUTH)
      const ms = typeof performance !== "undefined" ? Math.round(performance.now() - t0) : null
      console.info(OPS_LOG, "Respuesta OK.", { ms, resumen: summarizeOperationsResponse(raw) })
      const parsed = parseOperationsPayload(raw)
      console.info(OPS_LOG, "Tras parseo (filas válidas):", {
        count: parsed.length,
        nombres: parsed.map((o) => o.nombre),
      })
      applyPayload(parsed)
    } catch (err) {
      const status = (err as { status?: number })?.status
      console.error(OPS_LOG, "Fallo al cargar operaciones.", {
        status,
        mensaje: err instanceof Error ? err.message : String(err),
      })
      setFetchError(err instanceof Error ? err.message : "Error al cargar operaciones")
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
        console.info(OPS_LOG, "Sesión /api/auth/me OK.", { email: me.email, role: me.role })
        if (!canAccessAdminPages(me.role)) {
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
      await apiClient.post<unknown, { nombre: string; responsables: string[] }>(
        "/api/admin/operations",
        {
          nombre,
          responsables: [],
        },
        OPS_AUTH,
      )
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
      await apiClient.delete(operationsPath(deleteTarget), undefined, OPS_AUTH)
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
      await apiClient.delete(operationsPath(nombre, `/plates/${encodeURIComponent(normalized)}`), undefined, OPS_AUTH)
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

  const handleRemoveResponsable = async (nombre: string, email: string) => {
    const op = operations.find((o) => o.nombre === nombre)
    if (!op) return
    const next = op.responsables.filter((r) => r !== email)
    try {
      await apiClient.put<unknown, { responsables: string[] }>(
        operationsPath(nombre),
        { responsables: next },
        OPS_AUTH,
      )
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
      await apiClient.put<unknown, { responsables: string[] }>(
        operationsPath(nombre),
        { responsables: next },
        OPS_AUTH,
      )
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
      await apiClient.post<unknown, { plate: string }>(
        operationsPath(targetNombre, "/plates"),
        { plate: normalized },
        OPS_AUTH,
      )
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
        <p className="mt-2 text-sm text-muted-foreground">
          Esta seccion solo esta disponible para cuentas con permisos de administracion (no responsables de flota).
        </p>
      </div>
    )
  }

  const sinCount = sinAsignar.plates.length

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Operaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de operaciones, patentes y responsables</p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Solo se listan patentes que RSV haya reportado al servidor. Para incorporar una unidad nueva, asignala desde la
            sección <span className="font-medium text-foreground">Sin asignar</span> al final de esta página.
          </p>
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

      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <Input
            type="search"
            placeholder="Buscar por operación, patente o email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="lg:min-w-0 lg:flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">Nombre A-Z</SelectItem>
                <SelectItem value="patentes">Más patentes</SelectItem>
                <SelectItem value="responsables">Más responsables</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAllExpanded((prev) => {
                  const next = !prev
                  const map: Record<string, boolean> = {}
                  for (const op of operations) {
                    map[op.nombre] = next
                  }
                  setCardExpanded((p) => ({ ...p, ...map }))
                  return next
                })
              }}
            >
              {allExpanded ? "Colapsar todo" : "Expandir todo"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chipOpsOrdered.map((op) => {
            const on = activeChips.has(op.nombre)
            return (
              <button
                key={op.nombre}
                type="button"
                className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => {
                  setActiveChips((prev) => {
                    const next = new Set(prev)
                    if (next.has(op.nombre)) next.delete(op.nombre)
                    else next.add(op.nombre)
                    return next
                  })
                }}
              >
                <Badge variant={on ? "default" : "outline"} className="cursor-pointer">
                  {op.nombre}
                </Badge>
              </button>
            )
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveChips(new Set(operations.map((o) => o.nombre)))}
          >
            Todas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveChips(new Set())}
          >
            Ninguna
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {operations.length} operaciones · {totalPlatesAllOps} patentes · mostrando {visibleOperations.length}
      </p>

      <div className="space-y-4">
        {visibleOperations.map((op) => {
          const pCount = op.plates.length
          const rCount = op.responsables.length
          const expanded = isCardExpanded(op.nombre)
          return (
            <Card key={op.nombre}>
              <Collapsible open={expanded} onOpenChange={(open) => setCardOpen(op.nombre, open)}>
                <CardHeader className={expanded ? "space-y-0 pb-3" : "space-y-0 p-0"}>
                  {!expanded ? (
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-t-lg px-6 py-5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={`Expandir operación ${op.nombre}`}
                      >
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-semibold leading-tight">{op.nombre}</h2>
                          <p className="text-xs text-muted-foreground">
                            {pCount} {pCount === 1 ? "patente" : "patentes"} · {rCount}{" "}
                            {rCount === 1 ? "responsable" : "responsables"}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </CollapsibleTrigger>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full min-w-0 flex-1 items-start gap-3 rounded-md py-0.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:items-center"
                          aria-label={`Colapsar operación ${op.nombre}`}
                        >
                          <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold leading-tight">{op.nombre}</h2>
                            <p className="text-xs text-muted-foreground">
                              {pCount} {pCount === 1 ? "patente" : "patentes"} · {rCount}{" "}
                              {rCount === 1 ? "responsable" : "responsables"}
                            </p>
                          </div>
                          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <CollapsibleTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            Ocultar
                          </Button>
                        </CollapsibleTrigger>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(op.nombre)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="border-t pt-4">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Patentes</h3>
                        <div className="flex flex-wrap gap-2">
                          {op.plates.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Ninguna patente en esta operacion.</span>
                          ) : (
                            op.plates.map((plate) => (
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
                            ))
                          )}
                        </div>
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
              <DialogDescription>
                Indica el nombre. Las patentes se asignan desde la seccion Sin asignar; los responsables, en la tarjeta.
              </DialogDescription>
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
