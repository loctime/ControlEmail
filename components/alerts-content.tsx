"use client"

import {
  AlertTriangle,
  AlertCircle,
  Info,
  Circle,
} from "lucide-react"
import { AppCard } from "@/components/app-card"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
import type { Alert } from "@/lib/data"

const alertStyleMap = {
  critica: {
    icon: AlertCircle,
    border: "border-l-destructive",
    iconColor: "text-destructive",
    bg: "bg-destructive/5",
  },
  advertencia: {
    icon: AlertTriangle,
    border: "border-l-warning",
    iconColor: "text-warning",
    bg: "bg-warning/5",
  },
  info: {
    icon: Info,
    border: "border-l-primary",
    iconColor: "text-primary",
    bg: "bg-primary/5",
  },
} as const

function getAlertStyle(tipo: string) {
  return (
    alertStyleMap[tipo as keyof typeof alertStyleMap] ?? {
      icon: Info,
      border: "border-l-border",
      iconColor: "text-muted-foreground",
      bg: "",
    }
  )
}

const alertTypeLabels: Record<string, string> = {
  critica: "Critica",
  advertencia: "Advertencia",
  info: "Informativa",
}

interface AlertsContentProps {
  alerts: Alert[]
}

export function AlertsContent({ alerts }: AlertsContentProps) {
  const unread = alerts.filter((a) => !a.leida)
  const read = alerts.filter((a) => a.leida)

  return (
    <PageContainer>
      <SectionHeader
        title="Centro de alertas"
        description={`${unread.length} sin leer de ${alerts.length} alertas totales`}
      />

      {unread.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Sin leer
          </h3>
          {unread.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Leidas
          </h3>
          {read.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const style = getAlertStyle(alert.tipo)
  const Icon = style.icon

  return (
    <AppCard
      className={`overflow-hidden border-l-4 ${style.border} ${!alert.leida ? style.bg : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {alertTypeLabels[alert.tipo] || alert.tipo}
            </span>
            {!alert.leida && (
              <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
            )}
          </div>
          <p className="text-sm leading-relaxed">{alert.mensaje}</p>
          <span className="text-xs text-muted-foreground">
            {alert.fecha} a las {alert.hora}
          </span>
        </div>
      </div>
    </AppCard>
  )
}
