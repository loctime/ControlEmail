"use client"

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { es } from "date-fns/locale"
import { ArrowLeft, ArrowRight, CalendarIcon, RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { Matcher } from "react-day-picker"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AsyncState } from "@/components/common/async-state"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDashboardData } from "@/hooks/domain/useDashboardData"
import { dashboardApi } from "@/services/api"
import { queryKeys } from "@/lib/query/queryKeys"
import {
  formatDDMMYYYY,
  getDateKeysLast7Days,
  getYesterdayKey,
  normalizeBusinessDate,
} from "@/lib/domain/date"
import { cn } from "@/lib/utils"
import type {
  DashboardAggregatedPayload,
  DashboardVehicleDetailDTO,
  TopDriverKeyDTO,
  TopDriversKeysByOperationDTO,
} from "@/services/api/dashboard/types"

type DashboardDatePreset = "day" | "week" | "month" | "year"

// ─── Top Excesos helpers ───────────────────────────────────────────────────────

type TopLimit = 5 | 10 | "todos"

interface TopPlateRow {
  plate: string
  operacion: string | null
  responsable: string | null
  excesos: number
  pct: number
  maxSpeed: number | null
  lastEventAt: string | null
}

interface TopOperacionRow {
  operacion: string
  responsables: string[]
  excesos: number
  pct: number
  plates: number
  maxSpeed: number | null
  lastEventAt: string | null
  topDriversKeys: TopDriverKeyDTO[]
  /** Ranking completo por operación (si viene del API); si no, null. */
  topDriversKeysAll: TopDriverKeyDTO[] | null
  /** Suma de excesos en todas las combinaciones del ranking llave/conductor (API), no solo las 3 filas mostradas. */
  topDriversAttributedTotal: number | null
}

function buildTopByPlate(details: DashboardVehicleDetailDTO[], totalExcesos: number): TopPlateRow[] {
  return details
    .filter((v) => v.excesos > 0)
    .sort((a, b) => b.excesos - a.excesos)
    .map((v) => ({
      plate: v.plate,
      operacion: v.operacion,
      responsable: v.responsable,
      excesos: v.excesos,
      pct: totalExcesos > 0 ? Math.round((v.excesos / totalExcesos) * 100) : 0,
      maxSpeed: v.maxSpeed,
      lastEventAt: v.lastEventAt,
    }))
}

function vehicleResponsablesList(v: DashboardVehicleDetailDTO): string[] {
  if (v.responsablesNormalized && v.responsablesNormalized.length > 0) {
    return v.responsablesNormalized.map((r) => String(r).trim()).filter(Boolean)
  }
  if (v.responsables && v.responsables.length > 0) {
    return v.responsables.map((r) => String(r).trim()).filter(Boolean)
  }
  return v.responsable ? [String(v.responsable).trim()] : []
}

type OperacionAgg = {
  excesos: number
  plates: Set<string>
  maxSpeed: number | null
  lastEventAt: string | null
  responsableSeen: Set<string>
  responsables: string[]
}

function appendResponsablesUnique(agg: OperacionAgg, names: string[]) {
  for (const raw of names) {
    const trimmed = String(raw).trim()
    const key = trimmed.toLowerCase()
    if (!key || agg.responsableSeen.has(key)) continue
    agg.responsableSeen.add(key)
    agg.responsables.push(trimmed)
  }
}

function buildTopByOperacion(
  details: DashboardVehicleDetailDTO[],
  totalExcesos: number,
  topDriversKeysByOperation: TopDriversKeysByOperationDTO[],
): TopOperacionRow[] {
  const map = new Map<string, OperacionAgg>()
  for (const v of details) {
    if (v.excesos === 0) continue
    const key = v.operacion ?? "Sin operación"
    const names = vehicleResponsablesList(v)
    let agg = map.get(key)
    if (!agg) {
      agg = {
        excesos: v.excesos,
        plates: new Set([v.plate]),
        maxSpeed: v.maxSpeed,
        lastEventAt: v.lastEventAt,
        responsableSeen: new Set(),
        responsables: [],
      }
      appendResponsablesUnique(agg, names)
      map.set(key, agg)
    } else {
      agg.excesos += v.excesos
      agg.plates.add(v.plate)
      if (v.maxSpeed != null && (agg.maxSpeed == null || v.maxSpeed > agg.maxSpeed)) agg.maxSpeed = v.maxSpeed
      if (v.lastEventAt != null && (agg.lastEventAt == null || v.lastEventAt > agg.lastEventAt)) agg.lastEventAt = v.lastEventAt
      appendResponsablesUnique(agg, names)
    }
  }
  const topDriversByOperationMap = new Map(
    topDriversKeysByOperation.map((item) => [item.operationName, item]),
  )
  return Array.from(map.entries())
    .map(([operacion, data]) => {
      const opTop = topDriversByOperationMap.get(operacion)
      return {
      operacion,
      responsables: data.responsables,
      excesos: data.excesos,
      pct: totalExcesos > 0 ? Math.round((data.excesos / totalExcesos) * 100) : 0,
      plates: data.plates.size,
      maxSpeed: data.maxSpeed,
      lastEventAt: data.lastEventAt,
      topDriversKeys: opTop?.topDriversKeys ?? [],
      topDriversKeysAll: opTop?.topDriversKeysAll ?? null,
      topDriversAttributedTotal:
        opTop?.topDriversKeysAttributedTotal != null
          ? opTop.topDriversKeysAttributedTotal
          : null,
      }
    })
    .sort((a, b) => b.excesos - a.excesos)
}

function formatLastEvent(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    return `${dd}/${mm} ${hh}:${min}`
  } catch {
    return "—"
  }
}

/** Muestra solo el usuario antes de @ si parece email; si no, el texto tal cual. */
function responsableShortLabel(value: string | null): string | null {
  if (!value) return null
  const t = value.trim()
  const at = t.indexOf("@")
  if (at > 0) return t.slice(0, at)
  return t
}

function applyLimit<T>(rows: T[], limit: TopLimit): T[] {
  if (limit === "todos") return rows
  return rows.slice(0, limit)
}

// ─── TopExcesosTable component ────────────────────────────────────────────────

interface TopExcesosPlateTableProps {
  rows: TopPlateRow[]
  limit: TopLimit
  onLimitChange: (l: TopLimit) => void
  title: string
}

function TopExcesosPlateTable({ rows, limit, onLimitChange, title }: TopExcesosPlateTableProps) {
  const visible = applyLimit(rows, limit)
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-white/80">{title}</CardTitle>
          <div className="flex gap-1">
            {([5, 10, "todos"] as TopLimit[]).map((l) => (
              <Button
                key={String(l)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  limit === l
                    ? "border border-primary/30 bg-primary/15 text-primary dark:border-white/20 dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70",
                )}
                onClick={() => onLimitChange(l)}
              >
                {l === "todos" ? "Todos" : `Top ${l}`}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/30">Sin excesos en el período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left text-white/40">
                  <th className="pb-2 font-normal">#</th>
                  <th className="pb-2 font-normal">Patente</th>
                  <th className="pb-2 font-normal">Operación</th>
                  <th className="pb-2 font-normal">Responsable</th>
                  <th className="pb-2 text-right font-normal">Excesos</th>
                  <th className="pb-2 text-right font-normal">%</th>
                  <th className="pb-2 text-right font-normal">Vel. máx</th>
                  <th className="pb-2 text-right font-normal">Último evento</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr key={row.plate} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 text-white/30">{i + 1}</td>
                    <td className="py-2 font-mono text-white/90">{row.plate}</td>
                    <td className="py-2 text-white/60">{row.operacion ?? <span className="text-white/25">—</span>}</td>
                    <td className="py-2 max-w-[120px] truncate text-white/50" title={row.responsable ?? undefined}>
                      {responsableShortLabel(row.responsable) ?? <span className="text-white/25">—</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums text-red-400 font-medium">{row.excesos}</td>
                    <td className="py-2 text-right tabular-nums text-white/40">{row.pct}%</td>
                    <td className="py-2 text-right tabular-nums text-white/60">
                      {row.maxSpeed != null ? `${row.maxSpeed} km/h` : <span className="text-white/25">—</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums text-white/40">{formatLastEvent(row.lastEventAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type OperacionViewMode = "table" | "cards"

/** Explica la diferencia entre el total de excesos de la operación y las filas del top llave/conductor. */
function TopLlavesConductoresFootnote({
  row,
  expanded,
  displayKeys,
}: {
  row: TopOperacionRow
  expanded: boolean
  displayKeys: TopDriverKeyDTO[]
}) {
  if (displayKeys.length === 0) return null
  const shownSum = displayKeys.reduce((s, i) => s + i.excesos, 0)
  const attributed =
    row.topDriversAttributedTotal != null ? row.topDriversAttributedTotal : shownSum
  const otherRanked = expanded ? 0 : Math.max(0, attributed - shownSum)
  const outsideRanked = Math.max(0, row.excesos - attributed)
  if (otherRanked === 0 && outsideRanked === 0) return null
  return (
    <div className="mt-2 space-y-1 border-t border-white/[0.05] pt-2">
      {otherRanked > 0 && (
        <p className="text-[10px] leading-snug text-white/35">
          +{otherRanked} excesos en otras combinaciones llave/conductor (no entran en el top 3 de la lista).
        </p>
      )}
      {outsideRanked > 0 && (
        <p className="text-[10px] leading-snug text-white/35">
          {outsideRanked} excesos del total operación no aparecen en este ranking: suelen ser eventos que no se
          agrupan en incidentes de velocidad con llave/conductor, o datos incompletos en esos incidentes.
        </p>
      )}
    </div>
  )
}

type TopLlavesVariant = "table" | "cards"

function TopLlavesConductoresBlock({ row, variant }: { row: TopOperacionRow; variant: TopLlavesVariant }) {
  const [expanded, setExpanded] = useState(false)
  const full = row.topDriversKeysAll
  const canExpand =
    full != null && full.length > row.topDriversKeys.length
  const keys = expanded && full ? full : row.topDriversKeys

  function topDriverTitle(item: TopDriverKeyDTO): string {
    const driverName = item.driverName?.trim() || "—"
    return `${item.keyLabel} - ${driverName}`
  }

  function topDriverSubtitle(item: TopDriverKeyDTO): string {
    return `${item.plate ?? "-"} • ${item.excesos} excesos`
  }

  function isUnassignedKey(item: TopDriverKeyDTO): boolean {
    return item.keyNumber == null || item.keyLabel.trim().toLowerCase() === "sin llave asignada"
  }

  if (keys.length === 0) {
    return variant === "table" ? (
      <span className="text-white/25">—</span>
    ) : (
      <div className="text-[11px] text-white/25">Sin datos</div>
    )
  }

  return (
    <div className={variant === "cards" ? "space-y-2" : "space-y-1.5"}>
      {variant === "table" && canExpand && !expanded && (
        <p className="text-[10px] leading-snug text-white/30">
          Primeras 3 combinaciones.{" "}
          <span className="text-white/45">Expandí con «Ver más».</span>
        </p>
      )}
      {variant === "cards" && (
        <>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
            Top llaves/conductores
          </div>
          <p className="mb-2 text-[10px] leading-snug text-white/30">
            {expanded
              ? `Mostrando las ${keys.length} combinaciones ordenadas por excesos.`
              : "Solo las 3 combinaciones con más excesos. Usá «Ver más» para ver el listado completo."}
          </p>
        </>
      )}
      {variant === "table" ? (
        <>
          {keys.map((item, idx) => (
            <div key={`${item.keyLabel}-${item.driverName}-${item.plate}-${idx}`} className="leading-tight">
              <div className="text-[11px] text-white/80">
                {isUnassignedKey(item) ? "⚠️" : "🔑"} {topDriverTitle(item)}
              </div>
              <div className="text-[10px] text-white/45">{topDriverSubtitle(item)}</div>
            </div>
          ))}
        </>
      ) : (
        <div className="space-y-2">
          {keys.map((item, idx) => (
            <div
              key={`${item.keyLabel}-${item.driverName}-${item.plate}-${idx}`}
              className="flex items-start gap-2"
            >
              <span className="w-4 text-[10px] text-white/25">{idx + 1}.</span>
              <div className="min-w-0">
                <div className="truncate text-[11px] text-white/80" title={topDriverTitle(item)}>
                  {isUnassignedKey(item) ? "⚠️" : "🔑"} {topDriverTitle(item)}
                </div>
                <div className="text-[10px] text-white/45">{topDriverSubtitle(item)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <TopLlavesConductoresFootnote row={row} expanded={expanded} displayKeys={keys} />
      {canExpand && (
        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 dark:text-white/70 dark:hover:bg-white/10"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Ver menos" : `Ver más (${full!.length - row.topDriversKeys.length} más)`}
          </Button>
        </div>
      )}
    </div>
  )
}

interface TopExcesosOperacionTableProps {
  rows: TopOperacionRow[]
  limit: TopLimit
  onLimitChange: (l: TopLimit) => void
  title: string
}

function TopExcesosOperacionTable({ rows, limit, onLimitChange, title }: TopExcesosOperacionTableProps) {
  const [viewMode, setViewMode] = useState<OperacionViewMode>("table")
  const visible = applyLimit(rows, limit)

  function speedClass(speed: number | null): string {
    if (!speed) return ""
    if (speed >= 130) return "bg-red-500/20 text-red-400"
    if (speed >= 110) return "bg-yellow-500/20 text-yellow-400"
    return "bg-green-500/20 text-green-400"
  }

  const deltaEl = (curr: number, prev: number | undefined) => {
    if (prev === undefined) return null
    const diff = curr - prev
    if (diff === 0) return <span className="text-[10px] text-white/30">= sin cambio</span>
    if (diff > 0) return <span className="text-[10px] text-red-400">+{diff} vs ant.</span>
    return <span className="text-[10px] text-green-400">{diff} vs ant.</span>
  }

  const CARD_ACCENTS = ["border-t-red-500/60", "border-t-yellow-500/60", "border-t-blue-500/60", "border-t-green-500/60"]

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-white/80">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-white/10 bg-white/[0.04] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "h-6 rounded px-2.5 text-[11px] font-medium transition-colors",
                  viewMode === "table"
                    ? "border border-primary/30 bg-primary/15 text-primary dark:border-white/20 dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/40 dark:hover:text-white/70",
                )}
              >
                Tabla
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "h-6 rounded px-2.5 text-[11px] font-medium transition-colors",
                  viewMode === "cards"
                    ? "border border-primary/30 bg-primary/15 text-primary dark:border-white/20 dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/40 dark:hover:text-white/70",
                )}
              >
                Cards
              </button>
            </div>
            <div className="flex gap-1">
              {([5, 10, "todos"] as TopLimit[]).map((l) => (
                <Button
                  key={String(l)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs",
                    limit === l
                      ? "border border-primary/30 bg-primary/15 text-primary dark:border-white/20 dark:bg-white/10 dark:text-white"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70",
                  )}
                  onClick={() => onLimitChange(l)}
                >
                  {l === "todos" ? "Todos" : `Top ${l}`}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {visible.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/30">Sin excesos en el período</p>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left text-white/40">
                  <th className="pb-2 align-bottom font-normal">#</th>
                  <th className="pb-2 align-bottom font-normal">Operación</th>
                  <th className="pb-2 align-bottom font-normal">Top llaves/conductores</th>
                  <th className="pb-2 align-bottom text-right font-normal">Excesos</th>
                  <th className="pb-2 align-bottom text-right font-normal">%</th>
                  <th className="pb-2 align-bottom text-right font-normal">Patentes</th>
                  <th className="pb-2 align-bottom text-right font-normal">Vel. máx</th>
                  <th className="pb-2 align-bottom text-right font-normal">Último evento</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr key={row.operacion} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 align-top text-white/30">{i + 1}</td>
                    <td className="py-3 align-top">
                      <div className="font-medium text-white/80">{row.operacion}</div>
                      <div className="mt-1">{deltaEl(row.excesos, undefined)}</div>
                    </td>
                    <td className="py-3 align-top">
                      <TopLlavesConductoresBlock row={row} variant="table" />
                    </td>
                    <td className="py-3 align-top text-right">
                      <div className="text-sm font-medium tabular-nums text-red-400">{row.excesos}</div>
                      <div className="mt-1.5 ml-auto h-1 w-12 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-red-500/60"
                          style={{ width: `${Math.max(row.pct, row.excesos > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 align-top text-right tabular-nums text-white/40">{row.pct}%</td>
                    <td className="py-3 align-top text-right tabular-nums text-white/60">{row.plates}</td>
                    <td className="py-3 align-top text-right">
                      {row.maxSpeed != null ? (
                        <span
                          className={cn(
                            "inline-block rounded px-2 py-0.5 text-xs font-medium tabular-nums",
                            speedClass(row.maxSpeed),
                          )}
                        >
                          {row.maxSpeed} km/h
                        </span>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                    <td className="py-3 align-top text-right tabular-nums text-white/40">{formatLastEvent(row.lastEventAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map((row, i) => (
              <div
                key={row.operacion}
                className={cn(
                  "rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 border-t-2",
                  CARD_ACCENTS[i % CARD_ACCENTS.length],
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-white/85">{row.operacion}</div>
                    <div className="mt-0.5 text-[10px] text-white/35">#{i + 1} en el ranking</div>
                  </div>
                  {row.maxSpeed != null && (
                    <span
                      className={cn(
                        "flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium tabular-nums",
                        speedClass(row.maxSpeed),
                      )}
                    >
                      {row.maxSpeed} km/h
                    </span>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "Excesos", value: row.excesos, accent: "text-red-400" },
                    { label: "% total", value: `${row.pct}%`, accent: "text-white/80" },
                    { label: "Patentes", value: row.plates, accent: "text-white/80" },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="rounded-md bg-white/[0.04] p-2 text-center">
                      <div className="mb-1 text-[10px] text-white/35">{label}</div>
                      <div className={cn("text-base font-medium leading-none tabular-nums", accent)}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mb-3">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-red-500/50 transition-all"
                      style={{ width: `${Math.max(row.pct, row.excesos > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-white/[0.05] pt-3">
                  <TopLlavesConductoresBlock row={row} variant="cards" />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2">
                  <span className="text-[10px] text-white/25">Último: {formatLastEvent(row.lastEventAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const STORAGE_KEY = "dashboard:selectedDate"
const STORAGE_PRESET_KEY = "dashboard:preset"
const STALE_TIME = 5 * 60_000

function readStoredDate(): string | undefined {
  if (typeof window === "undefined") return undefined
  try { return localStorage.getItem(STORAGE_KEY) ?? undefined } catch { return undefined }
}
function writeStoredDate(date: string): void {
  try { localStorage.setItem(STORAGE_KEY, date) } catch { /* ignore */ }
}
function readStoredPreset(): DashboardDatePreset | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const v = localStorage.getItem(STORAGE_PRESET_KEY)
    if (v === "day" || v === "week" || v === "month" || v === "year") return v
    return undefined
  } catch { return undefined }
}
function writeStoredPreset(preset: DashboardDatePreset): void {
  try { localStorage.setItem(STORAGE_PRESET_KEY, preset) } catch { /* ignore */ }
}

type DateState = { status: "pending" } | { status: "ready"; date: string }
type DateAction =
  | { type: "RESTORE"; date: string }
  | { type: "SET"; date: string }
  | { type: "INIT_FROM_API"; date: string }
  | { type: "INIT_FALLBACK" }

function dateReducer(state: DateState, action: DateAction): DateState {
  switch (action.type) {
    case "RESTORE": return { status: "ready", date: action.date }
    case "SET": return { status: "ready", date: action.date }
    case "INIT_FROM_API": return state.status === "ready" ? state : { status: "ready", date: action.date }
    case "INIT_FALLBACK": return state.status === "ready" ? state : { status: "ready", date: getYesterdayKey() }
    default: return state
  }
}

/** Nombres de mes en español para la etiqueta del filtro (preset Mes). */
const PERIOD_MONTH_NAMES_ES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
] as const

function formatPeriodLabel(dateStr: string, preset: DashboardDatePreset): string {
  if (preset === "day") return formatDDMMYYYY(dateStr)
  if (preset === "week") {
    const keys = getDateKeysLast7Days(dateStr)
    if (keys.length < 2) return formatDDMMYYYY(dateStr)
    return `${formatDDMMYYYY(keys[0])} - ${formatDDMMYYYY(keys[6])}`
  }
  if (preset === "month") {
    const [yStr, mStr] = dateStr.split("-")
    const y = Number(yStr)
    const m = Number(mStr)
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return formatDDMMYYYY(dateStr)
    }
    return `${PERIOD_MONTH_NAMES_ES[m - 1]} ${y}`
  }
  if (preset === "year") {
    const y = dateStr.slice(0, 4)
    if (!/^\d{4}$/.test(y)) return formatDDMMYYYY(dateStr)
    return y
  }
  return formatDDMMYYYY(dateStr)
}

function getPreviousParam(dateKey: string, preset: DashboardDatePreset): string {
  if (preset === "day") {
    const d = new Date(`${dateKey}T00:00:00`)
    d.setDate(d.getDate() - 1)
    return normalizeBusinessDate(d)
  }
  if (preset === "week") {
    const d = new Date(`${dateKey}T00:00:00`)
    d.setDate(d.getDate() - 7)
    return normalizeBusinessDate(d)
  }
  if (preset === "month") {
    const [y, m] = dateKey.slice(0, 7).split("-").map(Number)
    const prev = new Date(y, m - 2, 1)
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`
  }
  // year
  return String(Number(dateKey.slice(0, 4)) - 1)
}

function deltaLabel(curr: number, prev: number): string {
  const diff = curr - prev
  if (diff === 0) return "igual"
  return diff > 0 ? `+${diff}` : `${diff}`
}

function deltaClass(curr: number, prev: number): string {
  const diff = curr - prev
  if (diff === 0) return "text-white/40"
  return diff > 0 ? "text-red-400" : "text-green-400"
}

interface KpiCardProps {
  label: string
  value: number
  prev: number | null
  accentClass: string
  prevLabel: string
}

function KpiCard({ label, value, prev, accentClass, prevLabel }: KpiCardProps) {
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardContent className="pb-4 pt-5">
        <p className="mb-1 text-xs text-white/40">{label}</p>
        <p className={cn("text-3xl font-bold tabular-nums", accentClass)}>{value}</p>
        {prev !== null && (
          <p className={cn("mt-1 text-xs", deltaClass(value, prev))}>
            {deltaLabel(value, prev)} vs {prevLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function SuperDashboardPage() {
  const [dateState, dispatch] = useReducer(dateReducer, { status: "pending" })
  const [preset, setPreset] = useState<DashboardDatePreset>(() => readStoredPreset() ?? "day")
  const hasRestoredRef = useRef(false)

  const selectedDate = dateState.status === "ready" ? dateState.date : undefined

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = readStoredDate()
    if (stored) dispatch({ type: "RESTORE", date: stored })
  }, [])

  useEffect(() => { writeStoredPreset(preset) }, [preset])

  const {
    data: lastDateData,
    isLoading: loadingLastDate,
    error: lastDateError,
  } = useQuery({
    queryKey: queryKeys.dashboard.lastDate(),
    queryFn: dashboardApi.myLastDateWithData,
    staleTime: STALE_TIME,
  })

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateData?.date) dispatch({ type: "INIT_FROM_API", date: normalizeBusinessDate(lastDateData.date) })
  }, [lastDateData?.date])

  useEffect(() => {
    if (!hasRestoredRef.current) return
    if (lastDateError) dispatch({ type: "INIT_FALLBACK" })
  }, [lastDateError])

  useEffect(() => {
    if (selectedDate) writeStoredDate(selectedDate)
  }, [selectedDate])

  const setDate = useCallback((date: string) => dispatch({ type: "SET", date }), [])

  // Current period
  const {
    vehicleDetails,
    topDriversKeysByOperation,
    riskVehicles,
    dailyBreakdown,
    distribution: periodDistribution,
    loading,
    error,
    refetch,
  } =
    useDashboardData(selectedDate, preset)

  useEffect(() => {
    if (!selectedDate) return
    console.log("[AUDIT-FRONT] SuperDashboardPage query trigger", { preset, selectedDate })
  }, [preset, selectedDate])

  useEffect(() => {
    if (!dailyBreakdown) return
    console.log("[AUDIT-FRONT] SuperDashboardPage dailyBreakdown", {
      length: dailyBreakdown.length,
      first2: dailyBreakdown.slice(0, 2),
    })
  }, [dailyBreakdown])

  useEffect(() => {
    console.log("[AUDIT-FRONT] SuperDashboardPage vehicleDetails length", vehicleDetails.length)
  }, [vehicleDetails])

  // Previous period — compute param
  const prevApiParam = useMemo(() => {
    if (!selectedDate) return undefined
    const raw = getPreviousParam(selectedDate, preset)
    if (preset === "month") return raw            // already "YYYY-MM"
    if (preset === "year") return raw             // already "YYYY"
    return raw                                    // full dateKey
  }, [selectedDate, preset])

  const { data: prevPayload } = useQuery({
    queryKey: ["dashboard", "prev", preset, prevApiParam ?? ""],
    queryFn: async (): Promise<DashboardAggregatedPayload | null> => {
      if (!prevApiParam) return null
      try {
        return await dashboardApi.getEnriched(preset, prevApiParam)
      } catch { return null }
    },
    enabled: !!prevApiParam,
    staleTime: STALE_TIME,
  })

  // KPI totals (preferir `distribution` del backend cuando exista)
  const kpi = useMemo(() => {
    const dist = periodDistribution
    return {
      excesos:          dist?.excesos          ?? vehicleDetails.reduce((s, v) => s + (v.excesos ?? 0), 0),
      llave_sin_cargar: dist?.llave_sin_cargar ?? vehicleDetails.reduce((s, v) => s + (v.llave_sin_cargar ?? 0), 0),
      no_identificados: dist?.no_identificados ?? vehicleDetails.reduce((s, v) => s + (v.no_identificados ?? 0), 0),
      conductor_inactivo: dist?.conductor_inactivo ?? vehicleDetails.reduce((s, v) => s + (v.conductor_inactivo ?? 0), 0),
    }
  }, [vehicleDetails, periodDistribution])

  const kpiPrev = useMemo(() => {
    if (!prevPayload) return null
    const prevDetails = prevPayload.vehicleDetails ?? []
    const dist = prevPayload.distribution
    if (prevDetails.length === 0 && dist == null) return null
    return {
      excesos:          dist?.excesos          ?? prevDetails.reduce((s, v) => s + (v.excesos ?? 0), 0),
      llave_sin_cargar: dist?.llave_sin_cargar ?? prevDetails.reduce((s, v) => s + (v.llave_sin_cargar ?? 0), 0),
      no_identificados: dist?.no_identificados ?? prevDetails.reduce((s, v) => s + (v.no_identificados ?? 0), 0),
      conductor_inactivo: dist?.conductor_inactivo ?? prevDetails.reduce((s, v) => s + (v.conductor_inactivo ?? 0), 0),
    }
  }, [prevPayload])

  const prevLabel = useMemo(() => ({
    day: "día ant.", week: "semana ant.", month: "mes ant.", year: "año ant.",
  }[preset]), [preset])

  // Bar chart data
  const chartData = useMemo(() => {
    console.log(`[Chart] preset=${preset}, dailyBreakdown length=${dailyBreakdown?.length ?? "null"}, vehicleDetails=${vehicleDetails.length}`)
    // Preset day: mostrar top 10 patentes con más excesos
    if (preset === "day") {
      return vehicleDetails
        .filter((v) => v.excesos > 0)
        .sort((a, b) => b.excesos - a.excesos)
        .slice(0, 10)
        .map((v) => ({ plate: v.plate, label: v.plate, excesos: v.excesos }))
    }

    // Presets week: mantener comportamiento actual (excesos por día)
    if (preset === "week") {
      if (!dailyBreakdown || dailyBreakdown.length === 0) return []
      return [...dailyBreakdown]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({ date: d.date, label: formatDDMMYYYY(d.date).slice(0, 5), excesos: d.totalExcessEvents }))
    }

    // Preset month: agrupar por semana
    if (preset === "month") {
      if (!dailyBreakdown || dailyBreakdown.length === 0) return []
      const weeks = new Map<number, number>()
      for (const d of dailyBreakdown) {
        const day = parseInt(d.date.split("-")[2], 10)
        const week = Math.ceil(day / 7)
        const current = weeks.get(week) ?? 0
        weeks.set(week, current + d.totalExcessEvents)
      }
      const result = []
      for (let w = 1; w <= 4; w++) {
        const excesos = weeks.get(w) ?? 0
        if (excesos > 0) result.push({ week: w, label: `Sem ${w}`, excesos })
      }
      return result.length > 0 ? result : dailyBreakdown.map((d) => ({ date: d.date, label: formatDDMMYYYY(d.date).slice(0, 5), excesos: d.totalExcessEvents }))
    }

    // Preset year: agrupar por mes
    if (preset === "year") {
      if (!dailyBreakdown || dailyBreakdown.length === 0) return []
      const months = new Map<number, number>()
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
      for (const d of dailyBreakdown) {
        const month = parseInt(d.date.split("-")[1], 10)
        const current = months.get(month) ?? 0
        months.set(month, current + d.totalExcessEvents)
      }
      const result = []
      for (let m = 1; m <= 12; m++) {
        const excesos = months.get(m) ?? 0
        if (excesos > 0) result.push({ month: m, label: monthNames[m - 1], excesos })
      }
      return result.length > 0 ? result : dailyBreakdown.map((d) => ({ date: d.date, label: formatDDMMYYYY(d.date).slice(0, 5), excesos: d.totalExcessEvents }))
    }

    return []
  }, [preset, vehicleDetails, dailyBreakdown])

  // Distribution bars
  const distribution = useMemo(() => {
    const total = kpi.excesos + kpi.llave_sin_cargar + kpi.no_identificados + kpi.conductor_inactivo
    if (total === 0) return []
    const pct = (n: number) => Math.round((n / total) * 100)
    return [
      { label: "Excesos de velocidad", value: kpi.excesos, pct: pct(kpi.excesos), color: "bg-red-500/70" },
      { label: "Llaves sin cargar",    value: kpi.llave_sin_cargar, pct: pct(kpi.llave_sin_cargar), color: "bg-yellow-500/70" },
      { label: "No identificados",     value: kpi.no_identificados, pct: pct(kpi.no_identificados), color: "bg-orange-500/70" },
      { label: "Conductor inactivo",   value: kpi.conductor_inactivo, pct: pct(kpi.conductor_inactivo), color: "bg-blue-500/70" },
    ]
  }, [kpi])

  // Top excesos state
  const [topPlateLimit, setTopPlateLimit] = useState<TopLimit>(5)
  const [topOpLimit, setTopOpLimit] = useState<TopLimit>(5)

  const topByPlate = useMemo(() => buildTopByPlate(vehicleDetails, kpi.excesos), [vehicleDetails, kpi.excesos])
  const topByOperacion = useMemo(
    () => buildTopByOperacion(vehicleDetails, kpi.excesos, topDriversKeysByOperation),
    [vehicleDetails, kpi.excesos, topDriversKeysByOperation],
  )

  // Table rows
  const tableRows = useMemo(() => {
    const riskMap = new Map(riskVehicles.map((v) => [v.plate, v]))
    return vehicleDetails
      .map((v) => ({
        plate: v.plate,
        totalEvents: (v.excesos ?? 0) + (v.llave_sin_cargar ?? 0) + (v.no_identificados ?? 0) + (v.conductor_inactivo ?? 0) + (v.contactos ?? 0),
        riskScore: riskMap.get(v.plate)?.maxRisk ?? 0,
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, 10)
  }, [vehicleDetails, riskVehicles])

  const hasData = vehicleDetails.length > 0 || riskVehicles.length > 0

  // Navigation
  const maxAvailableDate = useMemo(() => getYesterdayKey(), [])
  const minAvailableDate = useMemo(
    () => (lastDateData?.minDate ? normalizeBusinessDate(lastDateData.minDate) : undefined),
    [lastDateData?.minDate],
  )
  const selectedDateLabel = useMemo(
    () => (selectedDate ? formatPeriodLabel(selectedDate, preset) : "Seleccionar fecha"),
    [selectedDate, preset],
  )
  const selectedDateObj = useMemo(
    () => (selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined),
    [selectedDate],
  )
  const maxDateObj = useMemo(() => new Date(`${maxAvailableDate}T00:00:00`), [maxAvailableDate])
  const disabledDays: Matcher | undefined = { after: maxDateObj }

  const canGoPrev = !!selectedDate && !!minAvailableDate && normalizeBusinessDate(selectedDate) > minAvailableDate
  const canGoNext = !!selectedDate && normalizeBusinessDate(selectedDate) < maxAvailableDate

  const handlePrev = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    if (preset === "day") d.setDate(d.getDate() - 1)
    else if (preset === "week") d.setDate(d.getDate() - 7)
    else if (preset === "month") d.setMonth(d.getMonth() - 1)
    else d.setFullYear(d.getFullYear() - 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, preset, setDate])

  const handleNext = useCallback(() => {
    if (!selectedDate) return
    const d = new Date(`${selectedDate}T00:00:00`)
    if (preset === "day") d.setDate(d.getDate() + 1)
    else if (preset === "week") d.setDate(d.getDate() + 7)
    else if (preset === "month") d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    setDate(normalizeBusinessDate(d))
  }, [selectedDate, preset, setDate])

  const handleRefetch = useCallback(() => void refetch(), [refetch])

  return (
    <div className="min-h-screen space-y-6 p-6">

      {/* SECCIÓN 1 — Selector de período */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-white/40">Vista ejecutiva · HSE, Operaciones y Gerencia</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            {(["day", "week", "month", "year"] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  preset === p
                    ? "border border-primary/40 bg-primary/20 text-primary shadow-sm dark:border-white/20 dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/70",
                )}
                onClick={() => setPreset(p)}
              >
                {p === "day" ? "Día" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
              </Button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04]">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none text-white/60 hover:text-white disabled:opacity-30"
              disabled={!canGoPrev}
              onClick={handlePrev}
            >
              <ArrowLeft size={15} />
            </Button>
            <div className="h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none text-white/60 hover:text-white disabled:opacity-30"
              disabled={!canGoNext}
              onClick={handleNext}
            >
              <ArrowRight size={15} />
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={loadingLastDate}
                className="h-9 gap-2 border-white/10 bg-white/[0.04] text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
              >
                <CalendarIcon size={14} className="text-white/40" />
                {selectedDateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-white/10 bg-zinc-900 p-0">
              <Calendar
                mode="single"
                locale={es}
                selected={selectedDateObj}
                onSelect={(d) => { if (d) setDate(normalizeBusinessDate(d)) }}
                disabled={disabledDays}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            disabled={loadingLastDate || !lastDateData?.date}
            className="h-9 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
            onClick={() => lastDateData?.date && setDate(normalizeBusinessDate(lastDateData.date))}
          >
            Último con datos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefetch}
            disabled={loading || !selectedDate}
            className="h-9 gap-1.5 border-white/10 bg-white/[0.04] text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      <AsyncState loading={loading} error={error} onRetry={handleRefetch} />

      {!loading && !error && !hasData && selectedDate && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="py-6 text-center text-sm text-white/40">
            No hay datos para el período: {selectedDateLabel}.
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasData && (
        <div className="space-y-6">

          {/* SECCIÓN 2 — 4 KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Excesos de velocidad"
              value={kpi.excesos}
              prev={kpiPrev?.excesos ?? null}
              accentClass={kpi.excesos > 0 ? "text-red-400" : "text-white"}
              prevLabel={prevLabel}
            />
            <KpiCard
              label="Llaves sin cargar"
              value={kpi.llave_sin_cargar}
              prev={kpiPrev?.llave_sin_cargar ?? null}
              accentClass={kpi.llave_sin_cargar > 0 ? "text-yellow-400" : "text-white"}
              prevLabel={prevLabel}
            />
            <KpiCard
              label="No identificados"
              value={kpi.no_identificados}
              prev={kpiPrev?.no_identificados ?? null}
              accentClass={kpi.no_identificados > 0 ? "text-yellow-400" : "text-white"}
              prevLabel={prevLabel}
            />
            <KpiCard
              label="Conductor inactivo"
              value={kpi.conductor_inactivo}
              prev={kpiPrev?.conductor_inactivo ?? null}
              accentClass="text-white"
              prevLabel={prevLabel}
            />
          </div>

          {/* SECCIÓN 3 — Dos columnas */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

            {/* Columna izquierda (60%): gráfico de barras */}
            <Card className="border-white/5 bg-white/[0.03] lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold text-white/80">
                  <span>
                    {preset === "day" && "Excesos de velocidad por patente"}
                    {preset === "week" && "Excesos de velocidad por día"}
                    {preset === "month" && "Excesos de velocidad por semana"}
                    {preset === "year" && "Excesos de velocidad por mes"}
                  </span>
                  {preset === "week" && (
                    <span className="text-xs font-normal text-white/45">
                      7 días atrás desde el último dato
                    </span>
                  )}
                  {preset === "month" && (
                    <span className="text-xs font-normal text-white/45">
                      Mes calendario según la fecha elegida
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "hsl(var(--muted-foreground) / 0.85)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground) / 0.85)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#18181b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                        itemStyle={{ color: "#f87171" }}
                      />
                      <Bar dataKey="excesos" name="Excesos" fill="#ef4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-white/30">
                    Sin datos de evolución disponibles
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Columna derecha (40%): distribución */}
            <Card className="border-white/5 bg-white/[0.03] lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white/80">
                  Distribución de eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {distribution.length === 0 ? (
                  <p className="py-10 text-center text-sm text-white/30">Sin eventos en el período</p>
                ) : (
                  <div className="space-y-4">
                    {distribution.map((d) => (
                      <div key={d.label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-white/60">{d.label}</span>
                          <span className="tabular-nums text-white/80">
                            {d.value} <span className="text-white/40">({d.pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={cn("h-full rounded-full transition-all", d.color)}
                            style={{ width: `${Math.max(d.pct, d.value > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 4 — Top excesos de velocidad */}
          {kpi.excesos > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
                Top excesos de velocidad
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <TopExcesosPlateTable
                  title="Por patente"
                  rows={topByPlate}
                  limit={topPlateLimit}
                  onLimitChange={setTopPlateLimit}
                />
                <TopExcesosOperacionTable
                  title="Por operación"
                  rows={topByOperacion}
                  limit={topOpLimit}
                  onLimitChange={setTopOpLimit}
                />
              </div>
            </div>
          )}

          {/* SECCIÓN 5 — Tabla */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/80">
                Vehículos con más eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tableRows.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/30">Sin datos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-xs text-white/40">
                        <th className="pb-2 font-normal">Patente</th>
                        <th className="pb-2 text-right font-normal">Total eventos</th>
                        <th className="pb-2 text-right font-normal">Risk score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr key={row.plate} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-2 font-mono text-white/90">{row.plate}</td>
                          <td className="py-2 text-right tabular-nums text-white/70">{row.totalEvents}</td>
                          <td className="py-2 text-right">
                            <span
                              className={cn(
                                "inline-block rounded px-2 py-0.5 text-xs font-medium tabular-nums",
                                row.riskScore >= 15
                                  ? "bg-red-500/20 text-red-400"
                                  : row.riskScore >= 8
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-green-500/20 text-green-400",
                              )}
                            >
                              {row.riskScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}
