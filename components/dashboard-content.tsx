"use client"

import { KPICards } from "@/components/kpi-cards"
import { EventsChart } from "@/components/events-chart"
import { RecentEventsTable } from "@/components/recent-events-table"
import type { VehicleEvent } from "@/lib/data"

interface DashboardContentProps {
  events: VehicleEvent[]
  onViewEventDetail: (event: VehicleEvent) => void
}

export function DashboardContent({
  events,
  onViewEventDetail,
}: DashboardContentProps) {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold text-balance">
          Panel de control
        </h2>
        <p className="text-xs text-muted-foreground">
          Resumen de actividad del dia - 5 de febrero de 2026
        </p>
      </div>
      <KPICards events={events} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <EventsChart />
        <RecentEventsTable events={events} onViewDetail={onViewEventDetail} />
      </div>
    </div>
  )
}
