import { Activity, AlertOctagon, Car, Gauge, ShieldAlert, Sigma } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardSummary } from "@/services/dashboard-api"

interface KpiCardsProps {
  summary: DashboardSummary
  loading?: boolean
}

export function KpiCards({ summary, loading = false }: KpiCardsProps) {
  const items = [
    { key: "vehiclesMonitored", label: "Vehiculos monitoreados", value: summary.vehiclesMonitored, icon: Car },
    { key: "vehiclesWithEvents", label: "Vehiculos con eventos", value: summary.vehiclesWithEvents, icon: Activity },
    { key: "totalEvents", label: "Total de eventos", value: summary.totalEvents, icon: Sigma },
    { key: "criticalEvents", label: "Eventos criticos", value: summary.criticalEvents, icon: AlertOctagon },
    { key: "maxRisk", label: "Riesgo maximo", value: summary.maxRisk, icon: ShieldAlert },
    { key: "avgRisk", label: "Riesgo promedio", value: summary.avgRisk, icon: Gauge },
  ] as const

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold tabular-nums">{item.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
