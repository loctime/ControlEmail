"use client"

import { useEffect, useMemo, useState } from "react"
import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Firestore,
  type DocumentData,
  type Query,
  type Timestamp,
} from "firebase/firestore"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { parseVehicleEventLine } from "@/lib/vehicle-event-parser"

type VehicleEventFs = {
  id: string
  plate?: string
  brand?: string
  model?: string
  speed?: number | null
  eventCategory?: string
  formatType?: string
  /** Si existe, es el valor exacto usado por el backend para el hash. Usar directo sin convertir. */
  eventTimestamp?: string | null
  eventDate?: Timestamp | Date | string | null
  rawEmailId?: string | null
  location?: string | null
  rawLine?: string | null
  createdAt?: Timestamp | Date | string | null
  /** Severidad guardada en Firestore (si el backend la persiste). */
  severity?: string | null
  [key: string]: unknown
}

type VehicleFs = {
  id: string
  plate?: string
  brand?: string
  model?: string
  lastLocation?: string | null
  lastEventAt?: Timestamp | Date | string | null
  lastEventId?: string | null
  driver?: string | null
  [key: string]: unknown
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`)
  }
  return value
}

function getFirebaseApp(): FirebaseApp {
  const existing = getApps()
  if (existing.length > 0) return existing[0]!
  return initializeApp({
    apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  })
}

function toIsoStringMaybe(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object" && value && "toDate" in (value as Record<string, unknown>)) {
    const d = (value as { toDate: () => Date }).toDate()
    return d.toISOString()
  }
  return null
}

function formatDateParts(iso: string | null): { eventDate: string; eventTime: string; eventTimestamp: string } {
  if (!iso) {
    return { eventDate: "", eventTime: "", eventTimestamp: "" }
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { eventDate: "", eventTime: "", eventTimestamp: "" }
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mi = String(d.getUTCMinutes()).padStart(2, "0")
  const ss = String(d.getUTCSeconds()).padStart(2, "0")
  return {
    eventDate: `${yyyy}-${mm}-${dd}`,
    eventTime: `${hh}:${mi}:${ss}`,
    eventTimestamp: iso,
  }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Timestamp usado para ordenar/display. Preferir eventTimestamp real; si no, eventDate; si no, createdAt. */
function pickEventTimestampIso(e: VehicleEventFs): string | null {
  const stored = e.eventTimestamp != null && String(e.eventTimestamp).trim() !== "" ? String(e.eventTimestamp) : null
  if (stored) return stored
  const fromEventDate = toIsoStringMaybe(e.eventDate)
  if (fromEventDate) return fromEventDate
  const fromCreatedAt = toIsoStringMaybe(e.createdAt)
  if (fromCreatedAt) return fromCreatedAt
  return null
}

/**
 * Exactamente el valor que debe usarse para recalcular el hash (mismo que backend).
 * Backend: plate|event.eventDate.toISOString()|rawLine
 * Si el doc tiene eventTimestamp (string), usarlo directo; si no, eventDate convertido a ISO.
 */
function getTimestampForHash(e: VehicleEventFs): string {
  const stored = e.eventTimestamp != null && String(e.eventTimestamp).trim() !== "" ? String(e.eventTimestamp) : null
  if (stored) return stored
  return toIsoStringMaybe(e.eventDate) ?? ""
}

function safeJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_k, v) => {
      if (v && typeof v === "object" && "toDate" in (v as Record<string, unknown>)) {
        try {
          return (v as { toDate: () => Date }).toDate().toISOString()
        } catch {
          return v
        }
      }
      return v
    },
    2,
  )
}

function buildComparableStored(e: VehicleEventFs) {
  const iso = pickEventTimestampIso(e)
  return {
    plate: (e.plate ?? "").toString(),
    brand: (e.brand ?? "").toString(),
    model: (e.model ?? "").toString(),
    speed: e.speed == null ? null : Number(e.speed),
    location: e.location == null ? null : String(e.location),
    eventDateIso: iso,
    eventCategory: (e.eventCategory ?? "").toString(),
    formatType: (e.formatType ?? "").toString(),
    rawLine: e.rawLine == null ? "" : String(e.rawLine),
  }
}

function diffFields(
  stored: ReturnType<typeof buildComparableStored>,
  parsed: ReturnType<typeof buildComparableStored>,
) {
  const keys = Object.keys(stored) as Array<keyof typeof stored>
  const diffs: Partial<Record<(typeof keys)[number], { stored: unknown; parsed: unknown }>> = {}
  for (const k of keys) {
    const a = stored[k]
    const b = parsed[k]
    const equal = a === b || (a == null && b == null)
    if (!equal) diffs[k] = { stored: a, parsed: b }
  }
  return diffs
}

/** Lógica alineada con backend: crítico ≥130, advertencia ≥110, info <110. Solo para comparación en debug. */
function severityBackendFromSpeed(speed: number | null | undefined): "" | "critico" | "advertencia" | "info" {
  if (speed == null || Number.isNaN(speed)) return ""
  if (speed >= 130) return "critico"
  if (speed >= 110) return "advertencia"
  return "info"
}

export type IntegrityBadge = "sin rawLine" | "hash mismatch" | "speed null" | "messageId vacío" | "sin plate" | "timestamp null"

function getMissingFields(e: VehicleEventFs): string[] {
  const missing: string[] = []
  if (e.brand == null || String(e.brand).trim() === "") missing.push("sin brand")
  if (e.model == null || String(e.model).trim() === "") missing.push("sin model")
  if (e.location == null || String(e.location).trim() === "") missing.push("sin location")
  if (e.speed == null) missing.push("sin speed")
  if (e.rawLine == null || String(e.rawLine).trim() === "") missing.push("sin rawLine")
  return missing
}

function getIntegrityBadges(
  e: VehicleEventFs,
  recomputedHash: string | undefined,
): IntegrityBadge[] {
  const badges: IntegrityBadge[] = []
  if (e.rawLine == null || String(e.rawLine).trim() === "") badges.push("sin rawLine")
  if (recomputedHash !== undefined && recomputedHash !== e.id) badges.push("hash mismatch")
  if (e.speed == null) badges.push("speed null")
  if (e.rawEmailId == null || String(e.rawEmailId).trim() === "") badges.push("messageId vacío")
  if (e.plate == null || String(e.plate).trim() === "") badges.push("sin plate")
  const ts = getTimestampForHash(e)
  if (!ts || ts.trim() === "") badges.push("timestamp null")
  return badges
}

function isInconsistent(e: VehicleEventFs, recomputedHash: string | undefined, severityMismatch: boolean): boolean {
  return (
    getIntegrityBadges(e, recomputedHash).length > 0 ||
    severityMismatch
  )
}

/** Devuelve charCodes del rawLine para detectar espacios dobles, caracteres raros, etc. */
function rawLineCharCodes(rawLine: string): string {
  return Array.from(rawLine)
    .map((c) => c.charCodeAt(0))
    .join(" ")
}

export function DebugVehicleEventsClient(props: { allowed: boolean; tokenHint: string }) {
  const { allowed, tokenHint } = props

  const [events, setEvents] = useState<VehicleEventFs[]>([])
  const [vehiclesByPlate, setVehiclesByPlate] = useState<Record<string, VehicleFs>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  )

  const [reparseResult, setReparseResult] = useState<ReturnType<typeof buildComparableStored> | null>(null)
  const [reparseDiffs, setReparseDiffs] = useState<ReturnType<typeof diffFields> | null>(null)

  const [hashByEventId, setHashByEventId] = useState<Record<string, string>>({})
  const [showOnlyInconsistent, setShowOnlyInconsistent] = useState(false)

  useEffect(() => {
    if (!allowed || events.length === 0) {
      setHashByEventId({})
      return
    }
    let cancelled = false
    const run = async () => {
      const entries = await Promise.all(
        events.map(async (e) => {
          const input = `${String(e.plate ?? "")}|${getTimestampForHash(e)}|${String(e.rawLine ?? "")}`
          const hex = await sha256Hex(input)
          return [e.id, hex] as const
        }),
      )
      if (cancelled) return
      setHashByEventId(Object.fromEntries(entries))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [allowed, events])

  useEffect(() => {
    if (!allowed) return

    let db: Firestore
    try {
      const app = getFirebaseApp()
      db = getFirestore(app)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inicializando Firebase")
      return
    }

    setLoading(true)
    setError(null)

    const vehicleEventsRef = collection(db, "apps", "emails", "vehicleEvents")
    const vehiclesRef = collection(db, "apps", "emails", "vehicles")

    const makeEventsQuery = (): Query<DocumentData> => {
      try {
        return query(vehicleEventsRef, orderBy("eventDate", "desc"), limit(100))
      } catch {
        return query(vehicleEventsRef, orderBy("createdAt", "desc"), limit(100))
      }
    }

    const unsubEvents = onSnapshot(
      makeEventsQuery(),
      (snap) => {
        const items: VehicleEventFs[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })) as VehicleEventFs[]
        setEvents(items)
        setLoading(false)
      },
      (err) => {
        setError(err.message ?? "Error leyendo vehicleEvents")
        setLoading(false)
      },
    )

    const unsubVehicles = onSnapshot(
      query(vehiclesRef, limit(500)),
      (snap) => {
        const map: Record<string, VehicleFs> = {}
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>
          const plate = (data.plate ?? d.id ?? "").toString()
          map[plate] = { id: d.id, ...data } as VehicleFs
        }
        setVehiclesByPlate(map)
      },
      () => {},
    )

    return () => {
      unsubEvents()
      unsubVehicles()
    }
  }, [allowed])

  useEffect(() => {
    setReparseResult(null)
    setReparseDiffs(null)
  }, [selectedId])

  const derivedRows = useMemo(() => {
    const rows = events.map((e) => {
      const iso = pickEventTimestampIso(e)
      const parts = formatDateParts(iso)
      const speed = e.speed == null ? null : Number(e.speed)
      const severityStored = e.severity != null ? String(e.severity).trim() || null : null
      const severityRecalc = severityBackendFromSpeed(speed)
      const severityMismatch =
        severityStored != null && severityRecalc !== "" && severityStored !== severityRecalc
      const messageId = e.rawEmailId ?? ""
      const timestampForHash = getTimestampForHash(e)
      const eventTimestampStored =
        e.eventTimestamp != null && String(e.eventTimestamp).trim() !== "" ? String(e.eventTimestamp) : null
      const eventDateDisplay = toIsoStringMaybe(e.eventDate)
      const createdAtDisplay = toIsoStringMaybe(e.createdAt)
      return {
        ...e,
        speed,
        severityStored,
        severityRecalc,
        severityMismatch,
        messageId,
        timestampForHash,
        eventTimestampStored,
        eventDateDisplay,
        createdAtDisplay,
        ...parts,
      }
    })
    rows.sort((a, b) => (a.eventTimestamp > b.eventTimestamp ? -1 : a.eventTimestamp < b.eventTimestamp ? 1 : 0))
    return rows
  }, [events])

  const rowsWithIntegrity = useMemo(() => {
    return derivedRows.map((r) => {
      const recomputedHash = hashByEventId[r.id]
      const integrityBadges = getIntegrityBadges(r, recomputedHash)
      const missingFields = getMissingFields(r)
      const inconsistent = isInconsistent(r, recomputedHash, r.severityMismatch)
      return {
        ...r,
        integrityBadges,
        missingFields,
        isInconsistent: inconsistent,
      }
    })
  }, [derivedRows, hashByEventId])

  const displayedRows = useMemo(() => {
    if (showOnlyInconsistent) return rowsWithIntegrity.filter((r) => r.isInconsistent)
    return rowsWithIntegrity
  }, [rowsWithIntegrity, showOnlyInconsistent])

  const doReparse = async () => {
    if (!selected) return
    const rawLine = selected.rawLine == null ? "" : String(selected.rawLine)
    const parsed = rawLine ? parseVehicleEventLine(rawLine) : null

    const storedComparable = buildComparableStored(selected)
    const parsedComparable = parsed
      ? {
          plate: parsed.plate,
          brand: parsed.brand,
          model: parsed.model,
          speed: parsed.speed == null ? null : Number(parsed.speed),
          location: parsed.location == null ? null : String(parsed.location),
          eventDateIso: parsed.eventDate,
          eventCategory: selected.eventCategory ? String(selected.eventCategory) : parsed.eventType,
          formatType: selected.formatType ? String(selected.formatType) : parsed.eventType,
          rawLine: parsed.rawLine,
        }
      : {
          plate: "",
          brand: "",
          model: "",
          speed: null,
          location: null,
          eventDateIso: null,
          eventCategory: "",
          formatType: "",
          rawLine: rawLine,
        }

    setReparseResult(parsedComparable)
    setReparseDiffs(diffFields(storedComparable, parsedComparable))
  }

  if (!allowed) {
    return (
      <div className="min-h-screen p-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>DEBUG · Vehicle Events</CardTitle>
            <CardDescription>Acceso restringido (admin).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tokenHint}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DEBUG · Auditoría de eventos (Firestore vs Front)</CardTitle>
          <CardDescription>
            Lectura directa desde <span className="font-mono">apps/emails/vehicleEvents</span> (últimos 100 por timestamp desc).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyInconsistent}
                onChange={(e) => setShowOnlyInconsistent(e.target.checked)}
                className="rounded border-input"
              />
              Mostrar solo inconsistentes
            </label>
            {showOnlyInconsistent && (
              <span className="text-xs text-muted-foreground">
                {displayedRows.length} de {rowsWithIntegrity.length} eventos
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>eventId</TableHead>
                  <TableHead>plate</TableHead>
                  <TableHead>brand</TableHead>
                  <TableHead>model</TableHead>
                  <TableHead className="text-right">speed</TableHead>
                  <TableHead>severity (guardada / recalc)</TableHead>
                  <TableHead>eventCategory</TableHead>
                  <TableHead>eventDate</TableHead>
                  <TableHead>eventTime</TableHead>
                  <TableHead>eventTimestamp</TableHead>
                  <TableHead>messageId</TableHead>
                  <TableHead>location</TableHead>
                  <TableHead>Integrity</TableHead>
                  <TableHead>Raw Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && displayedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-sm text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayedRows.map((e) => {
                  const isSelected = e.id === selectedId
                  const vehicle = e.plate ? vehiclesByPlate[String(e.plate)] : undefined
                  const hashInput = `${String(e.plate ?? "")}|${e.timestampForHash}|${String(e.rawLine ?? "")}`
                  return (
                    <TableRow
                      key={e.id}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn("cursor-pointer", isSelected && "bg-muted")}
                      onClick={() => setSelectedId(e.id)}
                      title={vehicle?.lastEventId ? `Vehículo.lastEventId: ${vehicle.lastEventId}` : undefined}
                    >
                      <TableCell className="font-mono text-xs">{e.id}</TableCell>
                      <TableCell className="font-mono text-xs">{String(e.plate ?? "")}</TableCell>
                      <TableCell className="text-xs">{String(e.brand ?? "")}</TableCell>
                      <TableCell className="text-xs">{String(e.model ?? "")}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{e.speed ?? ""}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1 items-center">
                          {e.severityStored != null && (
                            <Badge variant="outline" className="text-[10px]">
                              guardada: {e.severityStored}
                            </Badge>
                          )}
                          {e.severityRecalc && (
                            <Badge
                              variant={e.severityMismatch ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              recalc: {e.severityRecalc}
                            </Badge>
                          )}
                          {e.severityMismatch && (
                            <span className="text-destructive text-[10px]">mismatch</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{String(e.eventCategory ?? "")}</TableCell>
                      <TableCell className="font-mono text-xs">{e.eventDate}</TableCell>
                      <TableCell className="font-mono text-xs">{e.eventTime}</TableCell>
                      <TableCell className="font-mono text-xs">{e.eventTimestamp}</TableCell>
                      <TableCell className="font-mono text-xs">{String(e.messageId ?? "")}</TableCell>
                      <TableCell className="text-xs">{String(e.location ?? "")}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {e.integrityBadges.map((badge) => {
                            const label =
                              badge === "sin rawLine"
                                ? "🔴 sin rawLine"
                                : badge === "hash mismatch"
                                  ? "🔴 hash mismatch"
                                  : badge === "speed null"
                                    ? "🟠 speed null"
                                    : badge === "messageId vacío"
                                      ? "🟡 messageId vacío"
                                      : badge === "sin plate"
                                        ? "🔴 sin plate"
                                        : "🟠 timestamp null"
                            return (
                              <Badge
                                key={badge}
                                variant={
                                  badge === "sin rawLine" || badge === "hash mismatch" || badge === "sin plate"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[9px]"
                              >
                                {label}
                              </Badge>
                            )
                          })}
                          {e.missingFields.length > 0 && (
                            <span className="text-[9px] text-muted-foreground" title={e.missingFields.join(", ")}>
                              {e.missingFields.join(", ")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={(ev) => ev.stopPropagation()}>
                              Ver
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Raw Data</DialogTitle>
                              <DialogDescription className="font-mono text-xs">{e.id}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <div className="text-xs font-semibold mb-1">rawLine (visible)</div>
                                <pre className="max-h-40 overflow-auto rounded border bg-muted/30 p-3 text-xs">
                                  {String(e.rawLine ?? "")}
                                </pre>
                              </div>
                              <div>
                                <div className="text-xs font-semibold mb-1">rawLine charCodes</div>
                                <pre className="max-h-24 overflow-auto rounded border bg-muted/30 p-3 text-[10px] font-mono">
                                  {rawLineCharCodes(String(e.rawLine ?? ""))}
                                </pre>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-xs">
                                <div><span className="text-muted-foreground">eventTimestamp (almacenado):</span>{" "}
                                  {e.eventTimestampStored ?? <span className="text-muted-foreground">—</span>}
                                </div>
                                <div><span className="text-muted-foreground">eventDate:</span>{" "}
                                  {e.eventDateDisplay ?? <span className="text-muted-foreground">—</span>}
                                </div>
                                <div><span className="text-muted-foreground">createdAt:</span>{" "}
                                  {e.createdAtDisplay ?? <span className="text-muted-foreground">—</span>}
                                </div>
                                <div><span className="text-muted-foreground">Campo usado para hash:</span>{" "}
                                  <span className="font-mono">{e.eventTimestampStored ? "eventTimestamp" : "eventDate → ISO"}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold mb-1">Documento (JSON)</div>
                                <pre className="max-h-80 overflow-auto rounded border bg-muted/30 p-3 text-xs">
                                  {safeJson(e)}
                                </pre>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Hash input (mismo que backend): <span className="font-mono break-all">{hashInput}</span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Re-parseo de rawLine (parser backend)</CardTitle>
          <CardDescription>
            Ejecuta <span className="font-mono">parseVehicleEventLine()</span> con el{" "}
            <span className="font-mono">rawLine</span> y compara contra lo guardado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Selecciona un evento de la tabla para ver detalles.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Button onClick={() => void doReparse()}>Re-parsear rawLine</Button>
                <span className="text-xs text-muted-foreground font-mono">{selected.id}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded border p-4">
                  <div className="text-xs font-semibold mb-2">Guardado (Firestore)</div>
                  <pre className="max-h-72 overflow-auto text-xs">{safeJson(buildComparableStored(selected))}</pre>
                </div>
                <div className="rounded border p-4">
                  <div className="text-xs font-semibold mb-2">Parseado (re-ejecutado)</div>
                  <pre className="max-h-72 overflow-auto text-xs">{safeJson(reparseResult)}</pre>
                </div>
              </div>

              <div className="rounded border p-4">
                <div className="text-xs font-semibold mb-2">Diferencias (en rojo)</div>
                {!reparseDiffs ? (
                  <p className="text-sm text-muted-foreground">Ejecuta el re-parseo para ver la comparación.</p>
                ) : Object.keys(reparseDiffs).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin diferencias detectadas en los campos comparados.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(reparseDiffs).map(([k, v]) => (
                      <div key={k} className="rounded border border-destructive/40 bg-destructive/10 p-3">
                        <div className="text-xs font-mono font-semibold text-destructive">{k}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          <div className="text-xs">
                            <div className="text-[11px] text-muted-foreground">stored</div>
                            <pre className="text-xs">{safeJson(v?.stored)}</pre>
                          </div>
                          <div className="text-xs">
                            <div className="text-[11px] text-muted-foreground">parsed</div>
                            <pre className="text-xs">{safeJson(v?.parsed)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Panel por evento (hash y mismatch)</CardTitle>
          <CardDescription>
            Recalcula el hash determinístico y lo compara con el <span className="font-mono">eventId</span> (doc id).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {rowsWithIntegrity.slice(0, 20).map((r) => (
              <AccordionItem key={r.id} value={r.id}>
                <AccordionTrigger className="text-sm">
                  <span className="font-mono text-xs">{r.id.slice(0, 12)}…</span>
                  <span className="ml-3 font-mono text-xs">{String(r.plate ?? "")}</span>
                  {r.isInconsistent && (
                    <Badge variant="destructive" className="ml-2 text-[9px]">inconsistente</Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent>
                  <EventHashPanel
                    event={r}
                    timestampForHash={r.timestampForHash}
                    eventTimestampStored={r.eventTimestampStored}
                    eventDateDisplay={r.eventDateDisplay}
                    createdAtDisplay={r.createdAtDisplay}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Nota: se muestran 20 para no saturar la UI (la tabla arriba contiene los 100).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EventHashPanel({
  event,
  timestampForHash,
  eventTimestampStored,
  eventDateDisplay,
  createdAtDisplay,
}: {
  event: VehicleEventFs
  timestampForHash: string
  eventTimestampStored: string | null
  eventDateDisplay: string | null
  createdAtDisplay: string | null
}) {
  const [recomputed, setRecomputed] = useState<string>("")
  const saved = event.id

  useEffect(() => {
    const input = `${String(event.plate ?? "")}|${timestampForHash}|${String(event.rawLine ?? "")}`
    let cancelled = false
    void sha256Hex(input).then((hex) => {
      if (cancelled) return
      setRecomputed(hex)
    })
    return () => {
      cancelled = true
    }
  }, [event.plate, event.rawLine, timestampForHash])

  const mismatch = Boolean(recomputed) && recomputed !== saved

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground mb-2">
        <div>eventTimestamp (almacenado): {eventTimestampStored ?? "—"}</div>
        <div>eventDate: {eventDateDisplay ?? "—"}</div>
        <div>createdAt: {createdAtDisplay ?? "—"}</div>
        <div>Campo usado para hash: {eventTimestampStored ? "eventTimestamp (directo)" : "eventDate → ISO"}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={mismatch ? "destructive" : "outline"}>{mismatch ? "mismatch" : "ok"}</Badge>
        <span className="text-xs text-muted-foreground">Hash recalculado vs doc id</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border p-3">
          <div className="text-[11px] text-muted-foreground">hash guardado (eventId)</div>
          <div className="font-mono text-xs break-all">{saved}</div>
        </div>
        <div className={cn("rounded border p-3", mismatch && "border-destructive/50 bg-destructive/10")}>
          <div className="text-[11px] text-muted-foreground">hash determinístico recalculado</div>
          <div className={cn("font-mono text-xs break-all", mismatch && "text-destructive")}>
            {recomputed || "calculando..."}
          </div>
        </div>
      </div>
    </div>
  )
}

