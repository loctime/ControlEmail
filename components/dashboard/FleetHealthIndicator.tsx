"use client"

import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface FleetHealthIndicatorProps {
  maxRisk: number
  loading?: boolean
}

type HealthState = {
  label: "Estable" | "Atencion" | "Critica"
  emoji: string
  icon: typeof ShieldCheck
  classes: string
}

function getFleetHealth(maxRisk: number): HealthState {
  if (maxRisk >= 25) {
    return {
      label: "CRÍTICO",
      emoji: "!!",
      icon: ShieldX,
      classes: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
    }
  }

  if (maxRisk >= 15) {
    return {
      label: "ATENCIÓN",
      emoji: "!",
      icon: AlertTriangle,
      classes: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400",
    }
  }

  return {
    label: "ESTABLE",
    emoji: "+",
    icon: ShieldCheck,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400",
  }
}

export function FleetHealthIndicator({ maxRisk, loading = false }: FleetHealthIndicatorProps) {
  if (loading) return <Skeleton className="h-[72px] w-full rounded-xl" />

  const state = getFleetHealth(maxRisk)

  return (
    <section
      aria-label="Indicador global de salud de flota"
      className={cn("flex w-full items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200", state.classes)}
    >
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-90">Estado de flota</p>
        <span className="text-lg font-bold tracking-tight md:text-xl">{state.label}</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-current/20 bg-white/50 px-3 py-1.5 text-sm font-medium dark:bg-black/10">
        <state.icon className="h-4 w-4" aria-hidden />
        <span>Riesgo máximo: {typeof maxRisk === "number" ? maxRisk.toFixed(0) : maxRisk}</span>
      </div>
    </section>
  )
}
