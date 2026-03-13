"use client"

import { Gauge } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TopSpeedEventDTO } from "@/services/api/dashboard/types"
import { formatDDMMYYYY } from "@/lib/domain/date"

export interface HighestSpeedCardProps {
  /** Top speed event or null if none */
  event: TopSpeedEventDTO | null
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "—"
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ts
    return `${formatDDMMYYYY(ts)} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return ts
  }
}

export function HighestSpeedCard({ event }: HighestSpeedCardProps) {
  if (!event) {
    return (
      <Card className="border-white/5 bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white/80">
            Mayor velocidad registrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/40">Sin datos de excesos de velocidad en el período.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-white/50" />
          <CardTitle className="text-sm font-semibold text-white/80">
            Mayor velocidad registrada
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-lg font-semibold tracking-wider text-white/90">
            {event.plate}
          </span>
          <span className="text-2xl font-bold tabular-nums text-white">
            {event.speed} <span className="text-sm font-normal text-white/50">km/h</span>
          </span>
        </div>
        {event.location && (
          <p className="text-xs text-white/40">Ubicación: {event.location}</p>
        )}
        <p className="text-xs text-white/30">{formatTimestamp(event.timestamp)}</p>
      </CardContent>
    </Card>
  )
}
