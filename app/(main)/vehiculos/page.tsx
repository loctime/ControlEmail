"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { AsyncState } from "@/components/common/async-state"
import { VehicleDrawer } from "@/components/vehicles/VehicleDrawer"
import { useVehiclesList, type VehicleListRow } from "@/hooks/domain/useVehiclesList"
import { useNav } from "@/components/layout/nav-context"
import { authApi } from "@/services/api"
import { cn } from "@/lib/utils"

// ─── Formatters ───────────────────────────────────────────────────────────────

const BA_TZ = "America/Argentina/Buenos_Aires"

function formatLastEvent(value: string | null | undefined): string {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return "—"
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: BA_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d)
  } catch {
    return "—"
  }
}

function formatResponsables(responsables: string[]): string {
  if (responsables.length === 0) return "Sin responsables"
  const first = (responsables[0] ?? "").split("@")[0] ?? responsables[0] ?? ""
  if (responsables.length === 1) return first
  return `${first} +${responsables.length - 1}`
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<VehicleListRow, "plate" | "operationName" | "lastEvent" | "totalEventsCount" | "riskScore">
type SortDir = "asc" | "desc"

function sortRows(rows: VehicleListRow[], key: SortKey | null, dir: SortDir): VehicleListRow[] {
  if (!key) return rows
  return [...rows].sort((a, b) => {
    const av = a[key] ?? ""
    const bv = b[key] ?? ""
    const cmp = String(av) > String(bv) ? 1 : String(av) < String(bv) ? -1 : 0
    return dir === "asc" ? cmp : -cmp
  })
}

// ─── Table header cell ────────────────────────────────────────────────────────

function Th({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  sortKey?: SortKey
  activeSortKey: SortKey | null
  sortDir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sortKey && activeSortKey === sortKey
  return (
    <th className={cn("px-4 py-2.5 text-left text-xs font-normal text-white/40", className)}>
      {sortKey ? (
        <button
          type="button"
          className="flex items-center gap-1 hover:text-white/70"
          onClick={() => onSort(sortKey)}
        >
          {label}
          <span className={cn("text-[10px]", active ? "text-white/60" : "text-white/20")}>
            {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      ) : (
        label
      )}
    </th>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function VehiclesPage() {
  const { rows, loading, error, refetch } = useVehiclesList()
  const { collapse, expand } = useNav()
  const [isResponsable, setIsResponsable] = useState(false)

  useEffect(() => {
    let cancelled = false
    void authApi
      .me()
      .then((me) => {
        if (!cancelled) setIsResponsable(me.role === "responsable")
      })
      .catch(() => {
        if (!cancelled) setIsResponsable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const [search, setSearch] = useState("")
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>("riskScore")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [drawerPlate, setDrawerPlate] = useState<string | null>(null)

  const uniqueOperations = useMemo(() => {
    const ops = new Set<string>()
    rows.forEach((r) => { if (r.operationName) ops.add(r.operationName) })
    return Array.from(ops).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (selectedOperation) {
      result = result.filter((r) => r.operationName === selectedOperation)
    }
    const q = search.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (r) =>
          r.plate.toLowerCase().includes(q) ||
          (r.operationName ?? "").toLowerCase().includes(q) ||
          r.responsables.join(" ").toLowerCase().includes(q),
      )
    }
    return result
  }, [rows, search, selectedOperation])

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function handleRowClick(plate: string) {
    const opening = drawerPlate !== plate
    if (opening) collapse()
    setDrawerPlate(opening ? plate : null)
  }

  function handleCloseAll() {
    if (!drawerPlate) return
    setDrawerPlate(null)
    expand()
  }

  const thProps = { activeSortKey: sortKey, sortDir, onSort: handleSort }

  return (
    // Outer wrapper: click fuera del contenido cierra el drawer y expande el nav
    <div
      className="transition-[padding-right] duration-300 ease-in-out"
      style={{ paddingRight: drawerPlate ? "480px" : "0px" }}
      onClick={handleCloseAll}
    >
      {/* stopPropagation para que clicks dentro del contenido no disparen handleCloseAll */}
      <div className="space-y-4 p-6" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Vehiculos</h1>
            <p className="mt-0.5 text-sm text-white/40">
              {isResponsable
                ? "Solo vehículos de tus patentes (donde figuras como responsable)."
                : "Listado consolidado con riesgo y responsables."}
            </p>
          </div>
          <LastClosedDateBadge />
        </div>

        {/* Filtros */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedOperation === null ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedOperation(null); setPage(1) }}
            >
              Todas
            </Button>
            {uniqueOperations.map((op) => (
              <Button
                key={op}
                variant={selectedOperation === op ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedOperation(op); setPage(1) }}
              >
                {op}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por patente, operacion o responsable"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
              Actualizar
            </Button>
          </div>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <AsyncState
              loading={loading}
              error={error}
              empty={!loading && filtered.length === 0}
              onRetry={() => void refetch()}
            />

            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-md border border-white/[0.07]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <Th label="Patente"       sortKey="plate"            {...thProps} className="font-mono" />
                        <Th label="Operacion"     sortKey="operationName"    {...thProps} />
                        <Th label="Ultimo evento" sortKey="lastEvent"        {...thProps} />
                        <Th label="Eventos"       sortKey="totalEventsCount" {...thProps} />
                        <Th label="Risk score"    sortKey="riskScore"        {...thProps} />
                        <Th label="Responsables"  activeSortKey={null} sortDir="asc" onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((row) => {
                        const isSelected = drawerPlate === row.plate
                        return (
                          <tr
                            key={row.plate}
                            onClick={() => handleRowClick(row.plate)}
                            className={cn(
                              "cursor-pointer border-b border-white/[0.05] transition-colors",
                              isSelected
                                ? "bg-white/[0.06] hover:bg-white/[0.07]"
                                : "hover:bg-white/[0.025]",
                            )}
                          >
                            {/* Patente */}
                            <td className="px-4 py-3 font-mono text-white/90">
                              {row.plate}
                            </td>

                            {/* Operacion */}
                            <td className="px-4 py-3 text-white/70">
                              {row.operationName ?? "—"}
                            </td>

                            {/* Ultimo evento */}
                            <td className={cn("px-4 py-3 tabular-nums", !row.lastEvent && "text-white/30")}>
                              {formatLastEvent(row.lastEvent)}
                            </td>

                            {/* Eventos */}
                            <td className="px-4 py-3 font-semibold tabular-nums text-white/90">
                              {row.totalEventsCount}
                            </td>

                            {/* Risk score */}
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums",
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

                            {/* Responsables */}
                            <td
                              className={cn("px-4 py-3 text-sm", row.responsables.length === 0 && "text-white/30")}
                              title={row.responsables.join(", ")}
                            >
                              {formatResponsables(row.responsables)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/30">
                    Página {currentPage} de {totalPages} · {filtered.length} vehículos
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      className="h-8 border-white/10 bg-white/[0.04] px-3 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
                      onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(1, p - 1)) }}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      className="h-8 border-white/10 bg-white/[0.04] px-3 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
                      onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages, p + 1)) }}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Detail drawer — fixed right, no overlay, page padding-right compensates */}
      <VehicleDrawer
        plate={drawerPlate}
        onClose={() => setDrawerPlate(null)}
      />
    </div>
  )
}
