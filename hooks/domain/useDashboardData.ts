"use client"

import { useCallback, useEffect, useState } from "react"
import { dashboardApi } from "@/services/api"
import type { MyAlertItemDTO, MyRiskDTO, MyStatsDTO } from "@/services/api/dashboard/types"
import type { DailyConsistencyDTO } from "@/services/api/quality/types"
import { getLastClosedDateKey } from "@/lib/domain/closed-date"

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
  const [stats, setStats] = useState<MyStatsDTO["stats"] | null>(null)
  const [riskVehicles, setRiskVehicles] = useState<MyRiskDTO["vehicles"]>([])
  const [pendingAlerts, setPendingAlerts] = useState<MyAlertItemDTO[]>([])
  const [consistency, setConsistency] = useState<DailyConsistencyDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const date = getLastClosedDateKey()
      const [statsRes, riskRes, alertsRes, consistencyRes] = await Promise.all([
        dashboardApi.myStats(),
        dashboardApi.myRisk(),
        dashboardApi.myAlerts({ limit: 200 }),
        dashboardApi.dailyConsistency(date),
      ])

      setStats(statsRes.stats)
      setRiskVehicles(Array.isArray(riskRes.vehicles) ? riskRes.vehicles : [])
      const alerts = Array.isArray(alertsRes.alerts) ? alertsRes.alerts : []
      setPendingAlerts(alerts.filter((item) => !item.alertSent))
      setConsistency(consistencyRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setStats(null)
      setRiskVehicles([])
      setPendingAlerts([])
      setConsistency(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { stats, riskVehicles, pendingAlerts, consistency, loading, error, refetch }
}
