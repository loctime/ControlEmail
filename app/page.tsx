"use client"

import { useState, useCallback, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNavbar } from "@/components/top-navbar"
import { DashboardContent } from "@/components/dashboard-content"
import { EventsContent } from "@/components/events-content"
import { EventDetailPanel } from "@/components/event-detail-panel"
import { VehiclesContent } from "@/components/vehicles-content"
import { AlertsContent } from "@/components/alerts-content"
import { SettingsContent } from "@/components/settings-content"
import { AppButton } from "@/components/app-button"
import { emailModuleService } from "@/services/emailModule"
import type { DailyAlertDTO } from "@/services/dto"
import { type VehicleEvent, type Vehicle } from "@/lib/data"

export default function Page() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<VehicleEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [events, setEvents] = useState<VehicleEvent[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [excesosFromDailyAlerts, setExcesosFromDailyAlerts] = useState<number | null>(null)
  const [pendingAlerts, setPendingAlerts] = useState<DailyAlertDTO[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [errorAlerts, setErrorAlerts] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const yesterday = await import("@/lib/domain/date").then((m) => m.getYesterdayKey())
      const [eventsRes, vehiclesRes, metricsRes] = await Promise.all([
        fetch("/api/vehicle-events"),
        fetch("/api/vehicles"),
        fetch(`/api/email/daily-metrics?date=${yesterday}`),
      ])
      if (!eventsRes.ok) throw new Error("Error al cargar eventos")
      if (!vehiclesRes.ok) throw new Error("Error al cargar vehículos")
      const [eventsData, vehiclesData] = await Promise.all([
        eventsRes.json(),
        vehiclesRes.json(),
      ])
      setEvents(Array.isArray(eventsData) ? eventsData : [])
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : [])

      if (metricsRes.ok) {
        const metrics = await metricsRes.json()
        const vehiclesList = metrics?.vehicles ?? []
        const total = vehiclesList.reduce(
          (sum: number, v: { summary?: { excesos?: number } }) => sum + (v.summary?.excesos ?? 0),
          0
        )
        setExcesosFromDailyAlerts(total)
      } else {
        setExcesosFromDailyAlerts(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
      setEvents([])
      setVehicles([])
      setExcesosFromDailyAlerts(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPendingAlerts = useCallback(async () => {
    setLoadingAlerts(true)
    setErrorAlerts(null)
    try {
      const list = await emailModuleService.getPendingAlerts()
      setPendingAlerts(Array.isArray(list) ? list : [])
    } catch (e) {
      setErrorAlerts(e instanceof Error ? e.message : "Error al cargar alertas")
      setPendingAlerts([])
    } finally {
      setLoadingAlerts(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchPendingAlerts()
  }, [fetchPendingAlerts])

  const pendingAlertsCount = pendingAlerts.length

  const handleViewDetail = useCallback((event: VehicleEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false)
    setSelectedEvent(null)
  }, [])

  const handleNavigate = useCallback((section: string) => {
    setActiveSection(section)
    setSearchQuery("")
  }, [])

  if (error) {
    return (
      <SidebarProvider>
        <AppSidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        pendingAlertsCount={pendingAlertsCount}
      />
        <SidebarInset>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <p className="text-destructive">{error}</p>
            <AppButton onClick={() => fetchData()}>
              Reintentar
            </AppButton>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        pendingAlertsCount={pendingAlertsCount}
      />
      <SidebarInset>
        <TopNavbar
          activeSection={activeSection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pendingAlertsCount={pendingAlertsCount}
          onNavigate={handleNavigate}
        />
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-muted-foreground">Cargando datos...</p>
            </div>
          ) : (
            <>
              {activeSection === "dashboard" && (
                <DashboardContent
                  events={events}
                  excesosFromDailyAlerts={excesosFromDailyAlerts}
                  onViewEventDetail={handleViewDetail}
                />
              )}
              {activeSection === "eventos" && (
                <EventsContent
                  events={events}
                  searchQuery={searchQuery}
                  onViewDetail={handleViewDetail}
                />
              )}
              {activeSection === "vehiculos" && (
                <VehiclesContent vehicles={vehicles} />
              )}
              {activeSection === "alertas" && (
                <AlertsContent
                  pendingAlerts={pendingAlerts}
                  loading={loadingAlerts}
                  error={errorAlerts}
                  onRefresh={fetchPendingAlerts}
                />
              )}
              {activeSection === "configuracion" && <SettingsContent />}
            </>
          )}
        </div>
        <EventDetailPanel
          event={selectedEvent}
          open={detailOpen}
          onClose={handleCloseDetail}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
