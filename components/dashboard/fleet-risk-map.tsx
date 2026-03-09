import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { RiskMapItem } from "@/services/dashboard-api"

interface FleetRiskMapProps {
  items: RiskMapItem[]
  loading?: boolean
}

function statusClasses(status: RiskMapItem["status"]): string {
  if (status === "rojo") return "border-red-300 bg-red-50 text-red-800"
  if (status === "amarillo") return "border-amber-300 bg-amber-50 text-amber-800"
  return "border-emerald-300 bg-emerald-50 text-emerald-800"
}

export function FleetRiskMap({ items, loading = false }: FleetRiskMapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de riesgo de flota</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.plate}
                className={`rounded-md border p-3 ${statusClasses(item.status)}`}
              >
                <div className="text-sm font-semibold">{item.plate}</div>
                <div className="text-xs">riesgo {item.riskScore}</div>
                <div className="text-xs">eventos {item.events}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
