"use client"

import { useState, useCallback } from "react"
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
  mockEvents,
  mockVehicles,
  mockAlerts,
  type VehicleEvent,
} from "@/lib/data"

export default function Page() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<VehicleEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const unreadAlerts = mockAlerts.filter((a) => !a.leida).length

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
          {activeSection === "dashboard" && (
            <DashboardContent
              events={mockEvents}
              onViewEventDetail={handleViewDetail}
            />
          )}
          {activeSection === "eventos" && (
            <EventsContent
              events={mockEvents}
              searchQuery={searchQuery}
              onViewDetail={handleViewDetail}
            />
          )}
          {activeSection === "vehiculos" && (
            <VehiclesContent vehicles={mockVehicles} />
          )}
          {activeSection === "alertas" && (
            <AlertsContent alerts={mockAlerts} />
          )}
          {activeSection === "configuracion" && <SettingsContent />}
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
