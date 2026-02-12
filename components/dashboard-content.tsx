"use client"

import { KPICards } from "@/components/kpi-cards"
import { EventsChart } from "@/components/events-chart"
import { RecentEventsTable } from "@/components/recent-events-table"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
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
    <PageContainer>
      <SectionHeader
        title="Panel de control"
        description={`Resumen de actividad del día — ${todayLabel}`}
      />
      <KPICards events={events} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <EventsChart chartData={chartData} />
        <RecentEventsTable events={events} onViewDetail={onViewEventDetail} />
      </div>
    </PageContainer>
  )
}
