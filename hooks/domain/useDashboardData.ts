"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/services/api"
import type {
  AdminTotalsDTO,
  DailyBreakdownPointDTO,
  DashboardAggregatedPayload,
  DashboardVehicleDetailDTO,
  MyAlertItemDTO,
  MyRiskItemDTO,
  MyStatsDTO,
} from "@/services/api/dashboard/types"
import type { DailyConsistencyDTO } from "@/services/api/quality/types"
import { queryKeys } from "@/lib/query/queryKeys"

const STALE_TIME_MS = 5 * 60 * 1000

/** Normalize aggregated stats to the shape expected by the UI (MyStatsDTO.stats) */
function normalizeStats(
  payload: DashboardAggregatedPayload | undefined,
): MyStatsDTO["stats"] | null {
  if (!payload?.stats) return null
  const s = payload.stats
  return {
    totalAlerts: s.totalAlerts ?? 0,
    alertsToday: s.totalAlerts ?? 0,
    alertsPending: s.alertsPending ?? 0,
    alertsSent: s.alertsSent ?? 0,
    maxRisk: s.maxRisk ?? 0,
    avgRisk: s.avgRisk ?? 0,
  }
}

export interface DashboardDataState {
  stats: MyStatsDTO["stats"] | null
  riskVehicles: MyRiskItemDTO[]
  pendingAlerts: MyAlertItemDTO[]
  consistency: DailyConsistencyDTO | null
  /** SuperDashboard: per-vehicle enriched data */
  vehicleDetails: DashboardVehicleDetailDTO[]
  /** SuperDashboard: admin alert category totals */
  adminTotals: AdminTotalsDTO | null
  /** SuperDashboard: last 7 days breakdown (week response only) */
  dailyBreakdown: DailyBreakdownPointDTO[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboardData(
  dateKey: string | undefined,
  mode: "day" | "week" | "month" | "year",
): DashboardDataState {
  const param =
    mode === "day"
      ? dateKey
      : mode === "week"
        ? dateKey
        : mode === "month"
          ? dateKey?.slice(0, 7)
          : dateKey?.slice(0, 4)

  const query = useQuery({
    queryKey: queryKeys.dashboard.aggregated(mode, param ?? ""),
    queryFn: async (): Promise<{
      stats: MyStatsDTO["stats"] | null
      riskVehicles: MyRiskItemDTO[]
      pendingAlerts: MyAlertItemDTO[]
      consistency: DailyConsistencyDTO | null
      vehicleDetails: DashboardVehicleDetailDTO[]
      adminTotals: AdminTotalsDTO | null
      dailyBreakdown: DailyBreakdownPointDTO[] | null
    }> => {
      if (!dateKey || !param) {
        return {
          stats: null,
          riskVehicles: [],
          pendingAlerts: [],
          consistency: null,
          vehicleDetails: [],
          adminTotals: null,
          dailyBreakdown: null,
        }
      }

      const payload = await dashboardApi.getEnriched(mode, param)

      return {
        stats: normalizeStats(payload),
        riskVehicles: Array.isArray(payload.vehicles) ? payload.vehicles : [],
        pendingAlerts: Array.isArray(payload.pendingAlerts)
          ? payload.pendingAlerts.filter((a) => !a.alertSent)
          : [],
        consistency: payload.consistency ?? null,
        vehicleDetails: Array.isArray(payload.vehicleDetails) ? payload.vehicleDetails : [],
        adminTotals: payload.adminTotals ?? null,
        dailyBreakdown: Array.isArray(payload.dailyBreakdown)
          ? payload.dailyBreakdown.map((d) => ({ date: d.date, totalExcessEvents: d.totalExcessEvents }))
          : null,
      }
    },
    enabled: !!dateKey && !!param,
    staleTime: STALE_TIME_MS,
  })

  const refetch = useCallback(async () => {
    await query.refetch()
  }, [query.refetch])

  return {
    stats: query.data?.stats ?? null,
    riskVehicles: query.data?.riskVehicles ?? [],
    pendingAlerts: query.data?.pendingAlerts ?? [],
    consistency: query.data?.consistency ?? null,
    vehicleDetails: query.data?.vehicleDetails ?? [],
    adminTotals: query.data?.adminTotals ?? null,
    dailyBreakdown: query.data?.dailyBreakdown ?? null,
    loading: query.isPending,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Error desconocido"
          : null,
    refetch,
  }
}
