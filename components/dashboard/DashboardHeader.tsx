"use client"

import { Activity, Loader2, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DashboardHeaderProps {
  isFetching?: boolean
}

export function DashboardHeader({ isFetching = false }: DashboardHeaderProps) {
  return (
    <header
      aria-label="Cabecera del dashboard de riesgo"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-muted/40 to-card p-6 text-foreground"
    >
      <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-16 left-24 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Fleet Risk Intelligence Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Control operativo y de riesgo de flota</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Visualizacion ejecutiva para operaciones y HSE con foco en deteccion temprana, tendencias y accion inmediata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 border border-border bg-muted text-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            Riesgo de flota
          </Badge>
          <Badge variant="secondary" className="gap-1.5 border border-border bg-muted text-foreground">
            <Activity className="h-3.5 w-3.5" />
            Monitoreo continuo
          </Badge>
          {isFetching && (
            <Badge variant="secondary" className="gap-1.5 border border-primary/20 bg-primary/10 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Actualizando
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}
