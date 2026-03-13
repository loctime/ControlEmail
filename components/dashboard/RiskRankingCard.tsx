"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RiskRow } from "@/components/dashboard/RiskRow"
import type { MyRiskItemDTO } from "@/services/api/dashboard/types"

export interface RiskRankingCardProps {
  /** Top N vehículos por riesgo (ej. 10) */
  vehicles: MyRiskItemDTO[]
  /** Total para el texto "X de Y" */
  totalCount: number
  globalMaxRisk: number
  /** Si true, mostrar "excesos" en lugar de "eventos" en cada fila */
  useExcessLabel?: boolean
}

export function RiskRankingCard({
  vehicles,
  totalCount,
  globalMaxRisk,
  useExcessLabel = false,
}: RiskRankingCardProps) {
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/80">
            Vehículos con conducción riesgosa
          </CardTitle>
          <span className="text-xs text-white/30">
            {vehicles.length} de {totalCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {vehicles.map((item, i) => (
          <RiskRow
            key={item.plate}
            index={i}
            plate={item.plate}
            alerts={item.alerts}
            maxRisk={item.maxRisk}
            globalMax={globalMaxRisk}
          />
        ))}
      </CardContent>
    </Card>
  )
}
