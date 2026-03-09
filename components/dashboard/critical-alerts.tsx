import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CriticalAlert } from "@/services/dashboard-api"

interface CriticalAlertsProps {
  alerts: CriticalAlert[]
  loading?: boolean
}

function eventLabel(value: string): string {
  return value.replace(/_/g, " ")
}

export function CriticalAlerts({ alerts, loading = false }: CriticalAlertsProps) {
  if (loading) {
    return (
      <Card className="border-red-300/40 bg-red-50/60">
        <CardHeader>
          <CardTitle className="text-red-700">Vehiculos con riesgo alto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) return null

  return (
    <Card className="border-red-300/50 bg-red-50/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Vehiculos con riesgo alto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((item) => (
          <div
            key={item.plate}
            className="flex flex-wrap items-center justify-between rounded-md border border-red-200 bg-white/80 px-3 py-2 text-sm"
          >
            <span className="font-semibold">{item.plate}</span>
            <span className="text-muted-foreground">{eventLabel(item.eventType)}</span>
            <span className="font-medium text-red-700">riesgo {item.riskScore}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
