"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MyAlertItemDTO } from "@/services/api/dashboard/types"
import { getRiskColor } from "./utils"
import { cn } from "@/lib/utils"

export interface PendingAlertsCardProps {
  /** Alertas a mostrar (ej. top N) */
  alerts: MyAlertItemDTO[]
  /** Total de alertas pendientes (para el badge) */
  totalCount: number
}

export function PendingAlertsCard({ alerts, totalCount }: PendingAlertsCardProps) {
  if (totalCount === 0) return null

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/80">
            Alertas pendientes
          </CardTitle>
          <Badge
            variant="outline"
            className="border-orange-400/20 bg-orange-400/10 text-orange-400"
          >
            {totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {alerts.map((alert) => (
            <div
              key={alert.alertId}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
            >
              <div>
                <p className="font-mono text-sm font-medium tracking-wider text-white/90">
                  {alert.plate}
                </p>
                <p className="mt-0.5 text-xs text-white/30">{alert.dateKey}</p>
              </div>
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-xs font-semibold tabular-nums",
                  getRiskColor(alert.riskScore)
                )}
              >
                {alert.riskScore}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
