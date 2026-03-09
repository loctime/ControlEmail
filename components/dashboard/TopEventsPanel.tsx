"use client"

import { memo, useMemo } from "react"
import { Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { EventDistribution, RecentEvent } from "@/services/dashboard-api"

interface TopEventsPanelProps {
  distribution: EventDistribution
  recentEvents: RecentEvent[]
  loading?: boolean
}

type EventKey = "contactos" | "excesos" | "sin conductor" | "sin llave" | "no identificados"

type EventRow = {
  key: EventKey
  label: string
  count: number
  topPlate: string | null
  topPlateCount: number
}

function normalizeEventType(value: string): EventKey {
  const normalized = value.replace(/_/g, " ").toLowerCase().trim()
  if (normalized.includes("contact")) return "contactos"
  if (normalized.includes("exceso")) return "excesos"
  if (normalized.includes("inactivo") || normalized.includes("sin conductor")) return "sin conductor"
  if (normalized.includes("no identificado") || normalized.includes("sin identificar")) return "no identificados"
  if (normalized.includes("llave") || normalized.includes("sin llave")) return "sin llave"
  return "contactos"
}

function TopEventsPanelBase({ distribution, recentEvents, loading = false }: TopEventsPanelProps) {
  const rows = useMemo<EventRow[]>(() => {
    const baseRows: EventRow[] = [
      { key: "contactos", label: "contactos peligrosos", count: distribution.contactos, topPlate: null, topPlateCount: 0 },
      { key: "excesos", label: "excesos de velocidad", count: distribution.excesos, topPlate: null, topPlateCount: 0 },
      { key: "sin conductor", label: "conductor inactivo", count: distribution.conductor_inactivo, topPlate: null, topPlateCount: 0 },
      { key: "no identificados", label: "no identificados", count: distribution.no_identificados, topPlate: null, topPlateCount: 0 },
      { key: "sin llave", label: "sin llave", count: distribution.llave_sin_cargar, topPlate: null, topPlateCount: 0 },
    ]

    const platesByEvent = new Map<EventKey, Map<string, number>>()

    recentEvents.forEach((event) => {
      const eventKey = normalizeEventType(event.eventType)
      const plateMap = platesByEvent.get(eventKey) ?? new Map<string, number>()
      plateMap.set(event.plate, (plateMap.get(event.plate) ?? 0) + 1)
      platesByEvent.set(eventKey, plateMap)
    })

    return baseRows
      .map((row) => {
        const plateMap = platesByEvent.get(row.key)
        if (!plateMap || plateMap.size === 0) return row

        const [topPlate, topPlateCount] = [...plateMap.entries()].sort((a, b) => b[1] - a[1])[0]
        return { ...row, topPlate, topPlateCount }
      })
      .sort((a, b) => b.count - a.count)
  }, [distribution, recentEvents])

  const total = useMemo(() => rows.reduce((acc, row) => acc + row.count, 0), [rows])

  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" aria-hidden />
          Top eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">No hay eventos registrados en el periodo.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
              return (
                <article
                  key={row.key}
                  tabIndex={0}
                  aria-label={`Evento ${row.label} con ${row.count} eventos, ${pct} por ciento del total`}
                  className="rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-sm text-muted-foreground">{row.count} eventos</p>
                      {row.topPlate && (
                        <p className="text-xs text-muted-foreground">
                          Patente top: <span className="font-mono font-semibold text-foreground">{row.topPlate}</span> ({row.topPlateCount})
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="border border-border bg-muted text-foreground">
                      {pct}%
                    </Badge>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const TopEventsPanel = memo(TopEventsPanelBase)
