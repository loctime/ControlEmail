"use client"

import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyConsistencyDTO } from "@/services/api/quality/types"
import { cn } from "@/lib/utils"

export interface DataConsistencyCardProps {
  consistency: DailyConsistencyDTO | null
}

export function DataConsistencyCard({ consistency }: DataConsistencyCardProps) {
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-white/80">
          Calidad de datos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consistency ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3">
              {consistency.isConsistent ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              ) : (
                <XCircle size={18} className="shrink-0 text-red-400" />
              )}
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    consistency.isConsistent ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {consistency.isConsistent ? "Consistente" : "Inconsistente"}
                </p>
                <p className="text-xs text-white/40">Estado de integridad de datos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <p className="text-xs text-white/40">Esperado</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-white">
                  {consistency.expectedTotal}
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <p className="text-xs text-white/40">Real</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-white">
                  {consistency.actualTotal}
                </p>
              </div>
            </div>

            {consistency.lastChecked && (
              <p className="flex items-center gap-1.5 text-xs text-white/30">
                <Clock size={11} />
                Verificado: {consistency.lastChecked}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30">Sin datos de consistencia para esta fecha.</p>
        )}
      </CardContent>
    </Card>
  )
}
