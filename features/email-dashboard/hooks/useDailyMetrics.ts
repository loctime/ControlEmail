"use client"

import { useEffect, useState } from "react"
import { emailModuleService } from "@/services/emailModule"
import type { DailyMetricsDTO } from "@/services/api/quality/types"

export function useDailyMetrics(date: string) {
  const [data, setData] = useState<DailyMetricsDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const metrics = await emailModuleService.getDailyMetrics(date)
        setData(metrics)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    if (date) {
      fetchData()
    }
  }, [date])

  return { data, loading, error }
}
