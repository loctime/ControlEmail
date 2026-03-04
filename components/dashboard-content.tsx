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
import { getYesterdayKey, getYesterdayDate } from "@/lib/domain/date"

interface DashboardContentProps {
  events: VehicleEvent[]
  onViewEventDetail: (event: VehicleEvent) => void
}

export function DashboardContent({
  events,
  onViewEventDetail,
}: DashboardContentProps) {
  // Día de referencia del sistema: ayer (las alertas se envían del día anterior).
  const referenceDate = getYesterdayDate()
  const referenceDateKey = getYesterdayKey()
  const yesterdayLabel = referenceDate.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const eventsList = Array.isArray(events) ? events : []
  const eventsOfReferenceDay = eventsList.filter((e) => e.fecha === referenceDateKey)
  if (typeof console !== "undefined" && console.log) {
    console.log("[DashboardContent] events:", eventsList.length, "del día ref:", eventsOfReferenceDay.length)
  }
  const weeklyData = getWeeklyVehicleWarnings(eventsList, referenceDate)
  const hoursData = getHourlyWarnings(eventsOfReferenceDay)

  return (
    <PageContainer>
      <SectionHeader
        title="Panel de control"
        description={`Resumen de actividad del día de ayer — ${yesterdayLabel}`}
      />
      <KPICards events={events} referenceDateKey={referenceDateKey} />
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
