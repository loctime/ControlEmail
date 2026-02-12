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
import {
  type VehicleEvent,
  type Vehicle,
  type Alert,
  alertsFromEvents,
} from "@/lib/data"

export default function Page() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<VehicleEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [events, setEvents] = useState<VehicleEvent[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eventsRes, vehiclesRes] = await Promise.all([
        fetch("/api/vehicle-events"),
        fetch("/api/vehicles"),
      ])
      if (!eventsRes.ok) throw new Error("Error al cargar eventos")
      if (!vehiclesRes.ok) throw new Error("Error al cargar vehículos")
      const [eventsData, vehiclesData] = await Promise.all([
        eventsRes.json(),
        vehiclesRes.json(),
      ])
      setEvents(Array.isArray(eventsData) ? eventsData : [])
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : [])
      setAlerts(alertsFromEvents(Array.isArray(eventsData) ? eventsData : []))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
      setEvents([])
      setVehicles([])
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const unreadAlerts = alerts.filter((a) => !a.leida).length

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
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />
        <SidebarInset>
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => fetchData()}
              className="ml-4 rounded bg-primary px-4 py-2 text-primary-foreground"
            >
              Reintentar
            </button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <SidebarInset>
        <TopNavbar
          activeSection={activeSection}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadAlerts={unreadAlerts}
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
                <AlertsContent alerts={alerts} />
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
