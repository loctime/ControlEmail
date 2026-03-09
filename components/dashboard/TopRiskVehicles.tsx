"use client"

import { memo } from "react"
import { ArrowUpRight, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { TopVehicle } from "@/services/dashboard-api"

interface TopRiskVehiclesProps {
  vehicles: TopVehicle[]
  loading?: boolean
}

function TopRiskVehiclesBase({ vehicles, loading = false }: TopRiskVehiclesProps) {
  return (
    <Card className="border-border bg-card text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-500" aria-hidden />
          Top Risk Vehicles
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-11 w-full" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin vehiculos con riesgo registrado.</p>
        ) : (
          <div className="space-y-2">
            {vehicles.slice(0, 8).map((vehicle, index) => (
              <article
                key={vehicle.plate}
                tabIndex={0}
                aria-label={`Top ${index + 1}, vehiculo ${vehicle.plate}, riesgo ${vehicle.riskScore}`}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="font-mono font-semibold tracking-wide">{vehicle.plate}</span>
                <span className="text-sm text-muted-foreground">{vehicle.events} eventos</span>
                <span className="inline-flex items-center gap-1 font-semibold text-red-500">
                  {vehicle.riskScore}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const TopRiskVehicles = memo(TopRiskVehiclesBase)
