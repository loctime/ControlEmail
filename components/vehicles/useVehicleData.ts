"use client"

import { useEffect, useState, useMemo } from "react"
import type { DailyAlertVehicle, VehicleDoc } from "@/lib/firestore-read"
import { getLastClosedDate } from "@/lib/domain/closed-date"
import { vehiclesApi } from "@/services/api"
import type { VehiclePlateDetailDTO } from "@/services/api/vehicles/types"

type VehicleDetailEvent = DailyAlertVehicle["events"][number]
type VehicleSpeedIncident = DailyAlertVehicle["speedIncidents"][number]

export interface VehicleKpis {
  totalEventos: number
  totalCriticos: number
  totalAdvertencias: number
  totalSinLlave: number
  ultimoEvento: VehicleDetailEvent | null
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
  operationName: string | null
  events: VehicleDetailEvent[]
  visibleEvents: VehicleDetailEvent[]
  speedIncidents: VehicleSpeedIncident[]
  totalEventsCount: number
  storedEventsCount: number
  eventsTruncated: boolean
  kpis: VehicleKpis
  score: number
  riskLevel: "bajo" | "medio" | "alto"
  trend: TrendData
  ranking: RankingData
  summary: DailyAlertVehicle["summary"]
  monthlyScores: MonthlyScore[]
  loading: boolean
  error: string | null
}

export function useVehicleData(plate: string, daysFilter: 7 | 30 | 90 = 30): VehicleDataResult {
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null)
  const [operationName, setOperationName] = useState<string | null>(null)
  const [events, setEvents] = useState<VehicleDetailEvent[]>([])
  const [speedIncidents, setSpeedIncidents] = useState<VehicleSpeedIncident[]>([])
  const [ranking, setRanking] = useState<RankingData>({ position: 0, totalVehicles: 0 })
  const [riskScoreFromApi, setRiskScoreFromApi] = useState<number | null>(null)
  const [totalEventsCount, setTotalEventsCount] = useState(0)
  const [storedEventsCount, setStoredEventsCount] = useState(0)
  const [previousTotalEventsCount, setPreviousTotalEventsCount] = useState(0)
  const [eventsTruncated, setEventsTruncated] = useState(false)
  const [summary, setSummary] = useState<DailyAlertVehicle["summary"]>({
    totalEvents: 0,
    criticalEvents: 0,
    warningEvents: 0,
    noKeyEvents: 0,
    excesos: 0,
    no_identificados: 0,
    contactos: 0,
    llave_sin_cargar: 0,
    conductor_inactivo: 0,
  })
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
        setOperationName(data.operationName ?? null)
        setEvents(data.events || [])
        setSpeedIncidents(data.speedIncidents || [])
        setRanking(data.ranking || { position: 0, totalVehicles: 0 })
        setRiskScoreFromApi(typeof data.riskScore === "number" ? data.riskScore : null)
        setTotalEventsCount(data.totalEventsCount ?? 0)
        setStoredEventsCount(data.storedEventsCount ?? 0)
        setPreviousTotalEventsCount(data.previousTotalEventsCount ?? 0)
        setEventsTruncated(Boolean(data.eventsTruncated))
        setSummary(data.summary)
      } catch (err) {
        const status = (err as { status?: number })?.status
        if (status === 404) {
          setError("Vehiculo no encontrado")
        } else {
          setError(err instanceof Error ? err.message : "Error desconocido")
        }
        setVehicle(null)
        setOperationName(null)
        setEvents([])
        setSpeedIncidents([])
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [plate, daysFilter])

  const visibleEvents = useMemo(() => {
    if (events.length === 0) return []
    const groupedSpeedEventIds = new Set(
      speedIncidents.flatMap((incident) => incident.eventIds ?? []),
    )
    return events
      .filter((event) => !groupedSpeedEventIds.has(event.eventId))
      .sort((a, b) => b.eventTimestamp.localeCompare(a.eventTimestamp))
  }, [events, speedIncidents])

  const kpis = useMemo((): VehicleKpis => {
    const totalEventos = totalEventsCount
    const totalCriticos = summary.criticalEvents
    const totalAdvertencias = summary.warningEvents
    const totalSinLlave = summary.noKeyEvents
    const ultimoEvento = visibleEvents.length > 0 ? visibleEvents[0] : null

    let diasSinEventos = 0
    if (ultimoEvento) {
      const ultimoEventoDate = new Date(ultimoEvento.eventTimestamp)
      const ahora = getLastClosedDate()
      const diffMs = ahora.getTime() - ultimoEventoDate.getTime()
      diasSinEventos = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    } else {
      diasSinEventos = 1
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
  }, [summary, totalEventsCount, visibleEvents])

  const score = useMemo(() => riskScoreFromApi ?? 0, [riskScoreFromApi])

  const riskLevel = useMemo<"bajo" | "medio" | "alto">(() => {
    if (score <= 5) return "bajo"
    if (score <= 15) return "medio"
    return "alto"
  }, [score])

  const trend = useMemo((): TrendData => {
    const currentPeriodEvents = totalEventsCount
    const previousPeriodEvents = previousTotalEventsCount

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
  }, [previousTotalEventsCount, totalEventsCount])

  const monthlyScores = useMemo((): MonthlyScore[] => {
    return []
  }, [])

  return {
    vehicle,
    operationName,
    events,
    visibleEvents,
    speedIncidents,
    totalEventsCount,
    storedEventsCount,
    eventsTruncated,
    kpis,
    score,
    riskLevel,
    trend,
    ranking,
    summary,
    monthlyScores,
    loading,
    error,
  }
}
