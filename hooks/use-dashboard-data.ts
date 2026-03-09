"use client"

import { useQueries } from "@tanstack/react-query"
import {
  dashboardApi,
  type DashboardRangeParams,
  type DashboardSummary,
  type EventDistribution,
  type CriticalAlert,
  type RiskMapItem,
  type TopVehicle,
  type RecentEvent,
  type TrendPoint,
} from "@/services/dashboard-api"

const STALE_TIME_MS = 5 * 60 * 1000

const EMPTY_SUMMARY: DashboardSummary = {
  vehiclesMonitored: 0,
  vehiclesWithEvents: 0,
  totalEvents: 0,
  criticalEvents: 0,
  maxRisk: 0,
  avgRisk: 0,
}

const EMPTY_DISTRIBUTION: EventDistribution = {
  excesos: 0,
  no_identificados: 0,
  contactos: 0,
  llave_sin_cargar: 0,
  conductor_inactivo: 0,
}

function makeKey(params: DashboardRangeParams): readonly [string, string, string, string] {
  return [
    params.range,
    params.startDate ?? "",
    params.endDate ?? "",
    params.range === "custom" ? "custom" : "preset",
  ]
}

export interface DashboardDataResult {
  summary: DashboardSummary
  distribution: EventDistribution
  criticalAlerts: CriticalAlert[]
  riskMap: RiskMapItem[]
  topVehicles: TopVehicle[]
  recentEvents: RecentEvent[]
  trend: TrendPoint[]
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboardData(params: DashboardRangeParams): DashboardDataResult {
  const key = makeKey(params)

  const [summaryQuery, topVehiclesQuery, eventsQuery, trendQuery] = useQueries({
    queries: [
      {
        queryKey: ["fleet-dashboard", "summary", ...key],
        queryFn: () => dashboardApi.getSummary(params),
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: ["fleet-dashboard", "top-vehicles", ...key],
        queryFn: () => dashboardApi.getTopVehicles(params),
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: ["fleet-dashboard", "events", ...key],
        queryFn: () => dashboardApi.getEvents(params),
        staleTime: STALE_TIME_MS,
      },
      {
        queryKey: ["fleet-dashboard", "trend", ...key],
        queryFn: () => dashboardApi.getTrend(params),
        staleTime: STALE_TIME_MS,
      },
    ],
  })

  const isLoading =
    summaryQuery.isPending || topVehiclesQuery.isPending || eventsQuery.isPending || trendQuery.isPending
  const isFetching =
    summaryQuery.isFetching || topVehiclesQuery.isFetching || eventsQuery.isFetching || trendQuery.isFetching

  const firstError =
    summaryQuery.error ?? topVehiclesQuery.error ?? eventsQuery.error ?? trendQuery.error ?? null

  const error =
    firstError instanceof Error
      ? firstError.message
      : firstError
        ? "Error desconocido"
        : null

  const refetch = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      topVehiclesQuery.refetch(),
      eventsQuery.refetch(),
      trendQuery.refetch(),
    ])
  }

  return {
    summary: summaryQuery.data?.summary ?? EMPTY_SUMMARY,
    distribution: eventsQuery.data?.distribution ?? EMPTY_DISTRIBUTION,
    criticalAlerts: eventsQuery.data?.criticalAlerts ?? ([] as CriticalAlert[]),
    riskMap: eventsQuery.data?.riskMap ?? ([] as RiskMapItem[]),
    topVehicles: topVehiclesQuery.data?.items ?? ([] as TopVehicle[]),
    recentEvents: eventsQuery.data?.recentEvents ?? ([] as RecentEvent[]),
    trend: trendQuery.data?.trend ?? ([] as TrendPoint[]),
    isLoading,
    isFetching,
    error,
    refetch,
  }
}
