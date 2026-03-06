"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/services/api"
import type { MyAlertItemDTO, MyRiskDTO, MyStatsDTO } from "@/services/api/dashboard/types"
import type { DailyConsistencyDTO } from "@/services/api/quality/types"
import { getLastClosedDateKey } from "@/lib/domain/closed-date"
import { queryKeys } from "@/lib/query/queryKeys"

interface DashboardDataState {
  stats: MyStatsDTO["stats"] | null
  riskVehicles: MyRiskDTO["vehicles"]
  pendingAlerts: MyAlertItemDTO[]
  consistency: DailyConsistencyDTO | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboardData(): DashboardDataState {
  const dateKey = getLastClosedDateKey()

  const query = useQuery({
    queryKey: queryKeys.dashboard.myData(dateKey),
    queryFn: async () => {
      const [statsRes, riskRes, alertsRes, consistencyRes] = await Promise.all([
        dashboardApi.myStats(),
        dashboardApi.myRisk(),
        dashboardApi.myAlerts({ limit: 200 }),
        dashboardApi.dailyConsistency(dateKey),
      ])

      const alerts = Array.isArray(alertsRes.alerts) ? alertsRes.alerts : []

      return {
        stats: statsRes.stats ?? null,
        riskVehicles: Array.isArray(riskRes.vehicles) ? riskRes.vehicles : [],
        pendingAlerts: alerts.filter((item) => !item.alertSent),
        consistency: consistencyRes ?? null,
      }
    },
    staleTime: 60_000,
  })

  const refetch = useCallback(async () => {
    await query.refetch()
  }, [query.refetch])

  return {
    stats: query.data?.stats ?? null,
    riskVehicles: query.data?.riskVehicles ?? [],
    pendingAlerts: query.data?.pendingAlerts ?? [],
    consistency: query.data?.consistency ?? null,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : query.error ? "Error desconocido" : null,
    refetch,
  }
}
