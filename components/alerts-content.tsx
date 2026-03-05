"use client"

import { AlertCircle, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"
import { AppCard } from "@/components/app-card"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { MyAlertItemDTO } from "@/services/dto"
import { getSeverityFromRiskScore } from "@/lib/domain/severity"
import { getSeverityLabel, getSeverityBadgeVariant } from "@/lib/domain/severity"
import { formatEventDateTime } from "@/lib/ui/datetime"

interface AlertsContentProps {
  pendingAlerts: MyAlertItemDTO[]
  loading: boolean
  error: string | null
  onRefresh?: () => void
}

export function AlertsContent({
  pendingAlerts,
  loading,
  error,
  onRefresh,
}: AlertsContentProps) {
  const count = pendingAlerts.length

  return (
    <PageContainer>
      <SectionHeader
        title="Centro de alertas"
        description={
          count > 0
            ? `${count} alerta${count !== 1 ? "s" : ""} pendiente${count !== 1 ? "s" : ""}`
            : "No hay alertas pendientes para tu usuario."
        }
      />

      {error && (
        <AppCard className="border-destructive">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-destructive">{error}</p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Reintentar
              </Button>
            )}
          </div>
        </AppCard>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <AppCard key={i} className="animate-pulse">
              <div className="h-16 rounded bg-muted" />
            </AppCard>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {count > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Pendientes
                </span>
                <Badge variant="destructive">{count}</Badge>
              </div>
              {pendingAlerts.map((alert) => (
                <MyAlertCard key={alert.alertId} alert={alert} />
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard">
                  <Button variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Dashboard de alertas
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <AppCard>
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 text-green-500" />
                <p className="font-medium">Sin alertas pendientes</p>
              </div>
            </AppCard>
          )}
        </>
      )}
    </PageContainer>
  )
}

function MyAlertCard({ alert }: { alert: MyAlertItemDTO }) {
  const severity = getSeverityFromRiskScore(alert.riskScore ?? 0)
  const label = getSeverityLabel(severity)
  const badgeVariant = getSeverityBadgeVariant(severity)
  const isHigh = severity === "HIGH" || severity === "CRITICAL"

  return (
    <AppCard
      className={`overflow-hidden border-l-4 ${
        isHigh ? "border-l-destructive bg-destructive/5" : "border-l-orange-500 bg-orange-500/5"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold">{alert.plate}</span>
            <Badge variant={badgeVariant}>{label}</Badge>
            <span className="text-sm text-muted-foreground">Score: {alert.riskScore}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Fecha: {alert.dateKey}</span>
            {alert.lastEventAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatEventDateTime(alert.lastEventAt)}
              </span>
            )}
          </div>
        </div>
        <Link href={`/vehiculos/${encodeURIComponent(alert.plate)}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver vehiculo
          </Button>
        </Link>
      </div>
    </AppCard>
  )
}
