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
      label: "Critica",
      emoji: "!!",
      icon: ShieldX,
      classes: "border-red-500/20 bg-red-500/10 text-red-500",
    }
  }

  if (maxRisk >= 15) {
    return {
      label: "Atencion",
      emoji: "!",
      icon: AlertTriangle,
      classes: "border-orange-500/20 bg-orange-500/10 text-orange-500",
    }
  }

  return {
    label: "Estable",
    emoji: "+",
    icon: ShieldCheck,
    classes: "border-green-500/20 bg-green-500/10 text-green-500",
  }
}

export function FleetHealthIndicator({ maxRisk, loading = false }: FleetHealthIndicatorProps) {
  if (loading) return <Skeleton className="h-24 w-full rounded-xl" />

  const state = getFleetHealth(maxRisk)

  return (
    <section
      aria-label="Indicador global de salud de flota"
      className={cn("rounded-xl border p-5 shadow-sm transition-all duration-300", state.classes)}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em]">Estado de flota</p>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <span aria-hidden>{state.emoji}</span>
            <span>{state.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm">
          <state.icon className="h-4 w-4" />
          <span className="font-medium">Riesgo maximo: {maxRisk.toFixed(1)}</span>
        </div>
      </div>
    </section>
  )
}
