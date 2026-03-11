"use client"

import { Activity, Loader2, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  isFetching?: boolean
}

export function DashboardHeader({ isFetching = false }: DashboardHeaderProps) {
  return (
    <header
      aria-label="Cabecera del dashboard de riesgo"
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 text-foreground transition-shadow duration-200",
        isFetching && "ring-1 ring-primary/20",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Control operativo y riesgo de flota
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            Monitoreo ejecutivo de eventos críticos, riesgo operativo y comportamiento de vehículos.
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant="secondary" className="gap-1 border border-border bg-muted text-foreground text-xs">
            <ShieldAlert className="h-3 w-3" />
            Riesgo de flota
          </Badge>
          <Badge variant="secondary" className="gap-1 border border-border bg-muted text-foreground text-xs">
            <Activity className="h-3 w-3" />
            Monitoreo continuo
          </Badge>
          {isFetching && (
            <Badge variant="secondary" className="gap-1 border border-primary/20 bg-primary/10 text-primary text-xs animate-in fade-in duration-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              Actualizando
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}
