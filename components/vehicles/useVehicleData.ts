"use client"

import { useEffect, useState, useMemo } from "react"
import type { VehicleDoc, VehicleEventDashboard } from "@/lib/firestore-read"

export interface VehicleKpis {
  totalEventos: number
  totalCriticos: number
  totalAdvertencias: number
  totalSinLlave: number
  ultimoEvento: VehicleEventDashboard | null
  diasSinEventos: number
}

export interface VehicleDataResult {
  vehicle: VehicleDoc | null
  events: VehicleEventDashboard[]
  filteredEvents: VehicleEventDashboard[]
  kpis: VehicleKpis
  score: number
  riskLevel: "bajo" | "medio" | "alto"
  loading: boolean
  error: string | null
}

export function useVehicleData(plate: string, daysFilter: 7 | 30 | 90 = 30): VehicleDataResult {
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null)
  const [events, setEvents] = useState<VehicleEventDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!plate) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const plateUpper = plate.toUpperCase()
        const response = await fetch(`/api/vehicles/${encodeURIComponent(plateUpper)}?daysBack=${daysFilter}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Vehículo no encontrado")
            setVehicle(null)
            setEvents([])
            setLoading(false)
            return
          }
          throw new Error(`Error ${response.status}: ${await response.text()}`)
        }

        const data = await response.json()
        setVehicle(data.vehicle)
        setEvents(data.events || [])
      } catch (err) {
        console.error("[useVehicleData] Error:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
        setVehicle(null)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [plate, daysFilter])

  // Eventos filtrados (ya vienen filtrados del servidor, pero por si acaso)
  const filteredEvents = useMemo(() => {
    if (!events.length) return []
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysFilter)
    
    return events.filter((event) => {
      const eventDate = new Date(event.eventTimestamp)
      return eventDate >= cutoffDate
    }).sort((a, b) => {
      return b.eventTimestamp.localeCompare(a.eventTimestamp)
    })
  }, [events, daysFilter])

  // Calcular KPIs
  const kpis = useMemo((): VehicleKpis => {
    const totalEventos = filteredEvents.length
    const totalCriticos = filteredEvents.filter((e) => e.severity === "critico").length
    const totalAdvertencias = filteredEvents.filter((e) => e.severity === "advertencia").length
    const totalSinLlave = filteredEvents.filter((e) => 
      e.type === "sin_llave" || 
      e.type === "sin_llave" || 
      e.type?.toLowerCase().includes("sin_llave") ||
      e.type?.toLowerCase().includes("sin llave")
    ).length
    const ultimoEvento = filteredEvents.length > 0 ? filteredEvents[0] : null
    
    // Calcular días sin eventos
    let diasSinEventos = 0
    if (ultimoEvento) {
      const ultimoEventoDate = new Date(ultimoEvento.eventTimestamp)
      const ahora = new Date()
      const diffMs = ahora.getTime() - ultimoEventoDate.getTime()
      diasSinEventos = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } else {
      diasSinEventos = daysFilter // Si no hay eventos, usar el rango completo
    }

    return {
      totalEventos,
      totalCriticos,
      totalAdvertencias,
      totalSinLlave,
      ultimoEvento,
      diasSinEventos,
    }
  }, [filteredEvents, daysFilter])

  // Calcular score de riesgo
  const score = useMemo(() => {
    return (
      kpis.totalCriticos * 5 +
      kpis.totalAdvertencias * 2 +
      kpis.totalSinLlave * 3
    )
  }, [kpis])

  // Determinar nivel de riesgo
  const riskLevel = useMemo<"bajo" | "medio" | "alto">(() => {
    if (score <= 5) return "bajo"
    if (score <= 15) return "medio"
    return "alto"
  }, [score])

  return {
    vehicle,
    events,
    filteredEvents,
    kpis,
    score,
    riskLevel,
    loading,
    error,
  }
}
