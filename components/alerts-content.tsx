"use client"

import {
  AlertTriangle,
  AlertCircle,
  Info,
  Circle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Alert } from "@/lib/data"

function getAlertStyle(tipo: string) {
  switch (tipo) {
    case "critica":
      return {
        icon: AlertCircle,
        border: "border-l-destructive",
        iconColor: "text-destructive",
        bg: "bg-destructive/5",
      }
    case "advertencia":
      return {
        icon: AlertTriangle,
        border: "border-l-chart-3",
        iconColor: "text-chart-3",
        bg: "bg-chart-3/5",
      }
    case "info":
      return {
        icon: Info,
        border: "border-l-chart-1",
        iconColor: "text-chart-1",
        bg: "bg-chart-1/5",
      }
    default:
      return {
        icon: Info,
        border: "border-l-border",
        iconColor: "text-muted-foreground",
        bg: "",
      }
  }
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
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold">Centro de alertas</h2>
        <p className="text-xs text-muted-foreground">
          {unread.length} sin leer de {alerts.length} alertas totales
        </p>
      </div>

      {unread.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Sin leer
          </h3>
          {unread.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Leidas
          </h3>
          {read.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const style = getAlertStyle(alert.tipo)
  const Icon = style.icon

  return (
    <Card
      className={`overflow-hidden border-l-4 ${style.border} ${!alert.leida ? style.bg : ""}`}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-4 w-4 ${style.iconColor}`} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {alertTypeLabels[alert.tipo] || alert.tipo}
            </span>
            {!alert.leida && (
              <Circle className="h-2 w-2 fill-primary text-primary" />
            )}
          </div>
          <p className="text-xs leading-relaxed">{alert.mensaje}</p>
          <span className="text-[10px] text-muted-foreground">
            {alert.fecha} a las {alert.hora}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
