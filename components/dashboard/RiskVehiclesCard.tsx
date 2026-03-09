"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MyRiskItemDTO } from "@/services/api/dashboard/types"
import { RiskRow } from "./RiskRow"

export interface RiskVehiclesCardProps {
  /** Top N vehículos a mostrar (ej. 10) */
  vehicles: MyRiskItemDTO[]
  /** Total de vehículos con riesgo (para el texto "X de Y") */
  totalCount: number
  globalMaxRisk: number
}

export function RiskVehiclesCard({ vehicles, totalCount, globalMaxRisk }: RiskVehiclesCardProps) {
  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/80">
            Vehículos de mayor riesgo
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
