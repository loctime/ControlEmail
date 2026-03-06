"use client"

import { useEffect, useState, useMemo } from "react"
import type { VehicleDoc, VehicleEventDashboard } from "@/lib/firestore-read"
import { getLastClosedDate } from "@/lib/domain/closed-date"
import { vehiclesApi } from "@/services/api"
import type { VehiclePlateDetailDTO } from "@/services/api/vehicles/types"

export interface VehicleKpis {
  totalEventos: number
  totalCriticos: number
  totalAdvertencias: number
  totalSinLlave: number
  ultimoEvento: VehicleEventDashboard | null
  diasSinEventos: number
  porcentajeSinLlave: number
}

export interface TrendData {
  currentPeriodEvents: number
  previousPeriodEvents: number
  trendPercentage: number
  trendDirection: "up" | "down" | "equal"
}

export interface RankingData {
  position: number
  totalVehicles: number
}

export interface MonthlyScore {
  month: string
  score: number
}

export interface VehicleDataResult {
  vehicle: VehicleDoc | null
  events: VehicleEventDashboard[]
  filteredEvents: VehicleEventDashboard[]
  kpis: VehicleKpis
  score: number
  riskLevel: "bajo" | "medio" | "alto"
  trend: TrendData
  ranking: RankingData
  monthlyScores: MonthlyScore[]
  loading: boolean
  error: string | null
}

export function useVehicleData(plate: string, daysFilter: 7 | 30 | 90 = 30): VehicleDataResult {
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null)
  const [events, setEvents] = useState<VehicleEventDashboard[]>([])
  const [previousEvents, setPreviousEvents] = useState<VehicleEventDashboard[]>([])
  const [ranking, setRanking] = useState<RankingData>({ position: 0, totalVehicles: 0 })
  const [riskScoreFromApi, setRiskScoreFromApi] = useState<number | null>(null)
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
        const data: VehiclePlateDetailDTO = await vehiclesApi.vehicleDetailByPlate(plateUpper, daysFilter)
        setVehicle(data.vehicle)
        setEvents(data.events || [])
        setPreviousEvents(data.previousEvents || [])
        setRanking(data.ranking || { position: 0, totalVehicles: 0 })
        setRiskScoreFromApi(typeof data.riskScore === "number" ? data.riskScore : null)
      } catch (err) {
        const status = (err as { status?: number })?.status
        if (status === 404) {
          setError("Vehiculo no encontrado")
        } else {
          setError(err instanceof Error ? err.message : "Error desconocido")
        }
        setVehicle(null)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [plate, daysFilter])

  const filteredEvents = useMemo(() => {
    if (!events.length) return []

    const cutoffDate = getLastClosedDate()
    cutoffDate.setDate(cutoffDate.getDate() - daysFilter)

    return events
      .filter((event) => {
        const eventDate = new Date(event.eventTimestamp)
        return eventDate >= cutoffDate
      })
      .sort((a, b) => b.eventTimestamp.localeCompare(a.eventTimestamp))
  }, [events, daysFilter])

  const kpis = useMemo((): VehicleKpis => {
    const totalEventos = filteredEvents.length
    const totalCriticos = filteredEvents.filter((e) => e.severity === "critico").length
    const totalAdvertencias = filteredEvents.filter((e) => e.severity === "advertencia").length
    const totalSinLlave = filteredEvents.filter(
      (e) =>
        e.type === "sin_llave" ||
        e.type === "sin_llave" ||
        e.type?.toLowerCase().includes("sin_llave") ||
        e.type?.toLowerCase().includes("sin llave"),
    ).length
    const ultimoEvento = filteredEvents.length > 0 ? filteredEvents[0] : null

    let diasSinEventos = 0
    if (ultimoEvento) {
      const ultimoEventoDate = new Date(ultimoEvento.eventTimestamp)
      const ahora = getLastClosedDate()
      const diffMs = ahora.getTime() - ultimoEventoDate.getTime()
      diasSinEventos = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } else {
      diasSinEventos = daysFilter
    }

    const porcentajeSinLlave = totalEventos > 0 ? Math.round((totalSinLlave / totalEventos) * 100) : 0

    return {
      totalEventos,
      totalCriticos,
      totalAdvertencias,
      totalSinLlave,
      ultimoEvento,
      diasSinEventos,
      porcentajeSinLlave,
    }
  }, [filteredEvents, daysFilter])

  const score = useMemo(() => riskScoreFromApi ?? 0, [riskScoreFromApi])

  const riskLevel = useMemo<"bajo" | "medio" | "alto">(() => {
    if (score <= 5) return "bajo"
    if (score <= 15) return "medio"
    return "alto"
  }, [score])

  const trend = useMemo((): TrendData => {
    const currentPeriodEvents = filteredEvents.length
    const previousPeriodEvents = previousEvents.length

    let trendPercentage = 0
    let trendDirection: "up" | "down" | "equal" = "equal"

    if (previousPeriodEvents === 0) {
      if (currentPeriodEvents > 0) {
        trendPercentage = 100
        trendDirection = "up"
      } else {
        trendPercentage = 0
        trendDirection = "equal"
      }
    } else {
      trendPercentage = Math.round(((currentPeriodEvents - previousPeriodEvents) / previousPeriodEvents) * 100)
      if (trendPercentage > 0) {
        trendDirection = "up"
      } else if (trendPercentage < 0) {
        trendDirection = "down"
      } else {
        trendDirection = "equal"
      }
    }

    return {
      currentPeriodEvents,
      previousPeriodEvents,
      trendPercentage,
      trendDirection,
    }
  }, [filteredEvents, previousEvents])

  const monthlyScores = useMemo((): MonthlyScore[] => {
    const months: Record<string, VehicleEventDashboard[]> = {}

    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toLocaleDateString("es-AR", { month: "short", year: "numeric" })
      months[monthKey] = []
    }

    events.forEach((event) => {
      try {
        const eventDate = new Date(event.eventTimestamp)
        const monthKey = eventDate.toLocaleDateString("es-AR", { month: "short", year: "numeric" })
        if (months[monthKey]) {
          months[monthKey].push(event)
        }
      } catch {
        // Ignorar eventos con fecha invalida.
      }
    })

    return Object.entries(months).map(([month, monthEvents]) => {
      const criticos = monthEvents.filter((e) => e.severity === "critico").length
      const advertencias = monthEvents.filter((e) => e.severity === "advertencia").length
      const sinLlave = monthEvents.filter(
        (e) =>
          e.type === "sin_llave" ||
          e.type?.toLowerCase().includes("sin_llave") ||
          e.type?.toLowerCase().includes("sin llave"),
      ).length

      const monthScore = criticos * 5 + advertencias * 2 + sinLlave * 3

      return {
        month,
        score: monthScore,
      }
    })
  }, [events])

  return {
    vehicle,
    events,
    filteredEvents,
    kpis,
    score,
    riskLevel,
    trend,
    ranking,
    monthlyScores,
    loading,
    error,
  }
}
