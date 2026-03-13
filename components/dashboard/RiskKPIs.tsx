"use client"

import { BarChart3, Gauge, ShieldAlert, UserX } from "lucide-react"
import { KpiCard } from "@/components/dashboard/KpiCard"
import type { DashboardVehicleDetailDTO } from "@/services/api/dashboard/types"

export interface RiskKPIsProps {
  /** Total excesos de velocidad en el período */
  totalExcess: number
  /** Vehículos con al menos un exceso */
  vehiclesWithDangerousDriving: number
  /** Velocidad máxima registrada (km/h) o null */
  highestSpeed: number | null
  /** Cantidad de conductores reincidentes (aparecen en más de un incidente/vehículo) */
  recurrentDriversCount: number
}

export function RiskKPIs({
  totalExcess,
  vehiclesWithDangerousDriving,
  highestSpeed,
  recurrentDriversCount,
}: RiskKPIsProps) {
  const kpis = [
    {
      label: "Excesos de velocidad",
      value: totalExcess,
      icon: <BarChart3 size={20} />,
      accent: "default" as const,
    },
    {
      label: "Vehículos con conducción peligrosa",
      value: vehiclesWithDangerousDriving,
      icon: <ShieldAlert size={20} />,
      accent: "default" as const,
    },
    {
      label: "Velocidad máxima registrada",
      value: highestSpeed != null ? `${highestSpeed} km/h` : "—",
      icon: <Gauge size={20} />,
      accent: "default" as const,
    },
    {
      label: "Conductores reincidentes",
      value: recurrentDriversCount,
      icon: <UserX size={20} />,
      accent: recurrentDriversCount > 0 ? ("warning" as const) : "default",
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}
