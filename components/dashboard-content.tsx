"use client"

import { KPICards } from "@/components/kpi-cards"
import { VehiclesWarningsWeeklyChart } from "@/components/vehicles-warnings-weekly-chart"
import { HoursWarningsChart } from "@/components/hours-warnings-chart"
import { RecentEventsTable } from "@/components/recent-events-table"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
import {
  getWeeklyVehicleWarnings,
  getHourlyWarnings,
  type VehicleEvent,
} from "@/lib/data"

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
  const eventsList = Array.isArray(events) ? events : []
  if (typeof console !== "undefined" && console.log) {
    console.log("[DashboardContent] events:", eventsList.length, eventsList)
  }
  const weeklyData = getWeeklyVehicleWarnings(eventsList)
  const hoursData = getHourlyWarnings(eventsList)

  return (
    <PageContainer>
      <SectionHeader
        title="Panel de control"
        description={`Resumen de actividad del día — ${todayLabel}`}
      />
      <KPICards events={events} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <VehiclesWarningsWeeklyChart data={weeklyData} />
        <HoursWarningsChart data={hoursData} />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <RecentEventsTable events={events} onViewDetail={onViewEventDetail} />
      </div>
    </PageContainer>
  )
}
