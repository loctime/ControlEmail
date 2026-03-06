"use client"

import { useEffect, useState } from "react"
import { debugPendingAlertsService } from "@/services/debugPendingAlertsService"
import type { DebugPendingAlertDTO } from "@/services/api/alerts/types"

interface UseDebugPendingAlertsResult {
  data: DebugPendingAlertDTO[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDebugPendingAlerts(): UseDebugPendingAlertsResult {
  const [data, setData] = useState<DebugPendingAlertDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const alerts = await debugPendingAlertsService.listPending()
        setData(alerts)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
        setData([])
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [version])

  const refetch = () => setVersion((v) => v + 1)

  return { data, loading, error, refetch }
}

