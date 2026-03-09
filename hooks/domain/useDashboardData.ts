"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/services/api"
import type { MyAlertItemDTO, MyRiskDTO, MyStatsDTO } from "@/services/api/dashboard/types"
import type { DailyConsistencyDTO } from "@/services/api/quality/types"
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

export function useDashboardData(dateKey?: string): DashboardDataState {
  const query = useQuery({
    queryKey: queryKeys.dashboard.myData(dateKey),
    queryFn: async () => {
      const [statsRes, riskRes, alertsRes, consistencyRes] = await Promise.all([
        dashboardApi.myStats(dateKey),
        dashboardApi.myRisk(dateKey),
        dashboardApi.myAlerts({ date: dateKey, limit: 200 }),
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
    enabled: !!dateKey,
    // Usa staleTime y refetchOnWindowFocus del QueryClient (5 min, false) para evitar llamadas innecesarias cuando los datos están en caché.
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
