"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TopDriverKeyDTO {
  driverName: string
  keyNumber: number | null
  keyLabel: string
  plate: string | null
  excesos: number
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
}

interface OperacionDetailPanelProps {
  row: TopOperacionRow | null
  rank?: number
}

export function OperacionDetailPanel({ row, rank }: OperacionDetailPanelProps) {
  const [showAllResp, setShowAllResp] = useState(false)

  if (!row) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        Selecciona una operación en el gráfico
      </div>
    )
  }

  const names = row.responsables.map((r) => r.replace(/@\S+/g, "").trim()).filter(Boolean)
  const visibleNames = showAllResp ? names : names.slice(0, 2)
  const hidden = names.length - 2

  function formatLastEvent(dateStr: string | null): string {
    if (!dateStr) return "—"
    try {
      const d = new Date(dateStr)
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const hours = String(d.getHours()).padStart(2, "0")
      const mins = String(d.getMinutes()).padStart(2, "0")
      return `${day}/${month} ${hours}:${mins}`
    } catch {
      return dateStr
    }
  }

  function speedClass(speed: number | null): string {
    if (!speed) return ""
    if (speed >= 130) return "bg-red-500/20 text-red-400"
    if (speed >= 110) return "bg-yellow-500/20 text-yellow-400"
    return "bg-green-500/20 text-green-400"
  }

  function displayKeyLabel(label: string): string {
    if (/^sin llave/i.test(label)) return "Sin llave"
    return label.replace(/^llave\s+/i, "")
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 truncate text-base font-semibold text-white/90">{row.operacion}</span>
        {rank && (
          <span className="shrink-0 rounded bg-white/[0.06] px-2 py-0.5 text-xs text-white/45">
            🏆 #{rank}
          </span>
        )}
      </div>

      {/* Responsables */}
      {names.length > 0 && (
        <div className="mb-2 text-xs text-white/50">
          {visibleNames.join(", ")}
          {!showAllResp && hidden > 0 && (
            <>
              <span className="text-white/30"> +{hidden} más </span>
              <button
                type="button"
                onClick={() => setShowAllResp(true)}
                className="text-white/40 underline underline-offset-2 hover:text-white/60"
              >
                ver
              </button>
            </>
          )}
          {showAllResp && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setShowAllResp(false)}
                className="text-white/40 underline underline-offset-2 hover:text-white/60"
              >
                ver menos
              </button>
            </>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-400">
            {row.excesos} excesos
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium tabular-nums text-white/60">
            {row.pct}% eventos
          </span>
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium tabular-nums text-white/60">
            {row.plates} patentes
          </span>
        </div>
      </div>

      {/* Speed + Last Event */}
      {(row.maxSpeed != null || row.lastEventAt) && (
        <div className="mb-3 flex flex-col gap-1 text-[11px]">
          {row.maxSpeed != null && (
            <span className={cn("inline-block rounded px-2 py-0.5 font-medium tabular-nums w-fit", speedClass(row.maxSpeed))}>
              {row.maxSpeed} km/h
            </span>
          )}
          {row.lastEventAt && <span className="text-white/40">Último: {formatLastEvent(row.lastEventAt)}</span>}
        </div>
      )}

      {/* Top Llaves/Conductores */}
      {row.topDriversKeys.length > 0 && (
        <div className="border-t border-white/[0.05] pt-2">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
            Top conductores
          </div>
          <div className="space-y-1">
            {row.topDriversKeys.map((item, idx) => {
              const itemPct = row.excesos > 0 ? Math.round((item.excesos / row.excesos) * 100) : 0
              const isUnassigned = item.keyNumber == null || item.keyLabel.trim().toLowerCase() === "sin llave asignada"
              const pctClass = itemPct >= 40 ? "bg-red-500/20 text-red-400" : itemPct >= 20 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"

              return (
                <div key={`${item.keyLabel}-${item.driverName}-${item.plate}-${idx}`} className="flex items-center justify-between gap-2 text-[10px]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-white/80" title={displayKeyLabel(item.keyLabel)}>
                      {isUnassigned ? "⚠️" : "🔑"} {displayKeyLabel(item.keyLabel)}
                    </div>
                    <div className="truncate text-white/50" title={item.driverName?.trim() || "—"}>
                      {item.driverName?.trim() || "—"}
                    </div>
                  </div>
                  <span className={cn("inline-block rounded px-1 py-0.5 font-medium tabular-nums text-[10px] shrink-0", pctClass)}>
                    {itemPct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
