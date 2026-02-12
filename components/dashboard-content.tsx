"use client"

import { KPICards } from "@/components/kpi-cards"
import { EventsChart } from "@/components/events-chart"
import { RecentEventsTable } from "@/components/recent-events-table"
import { chartDataFromEvents, type VehicleEvent } from "@/lib/data"

interface DashboardContentProps {
  events: VehicleEvent[]
  onViewEventDetail: (event: VehicleEvent) => void
}

export function DashboardContent({
  events,
  onViewEventDetail,
}: DashboardContentProps) {
  const todayLabel = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const chartData = chartDataFromEvents(events)

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold text-balance">
          Panel de control
        </h2>
        <p className="text-xs text-muted-foreground">
          Resumen de actividad del día — {todayLabel}
        </p>
      </div>
      <KPICards events={events} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <EventsChart chartData={chartData} />
        <RecentEventsTable events={events} onViewDetail={onViewEventDetail} />
      </div>
    </div>
  )
}
