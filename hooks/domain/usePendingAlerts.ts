"use client"

import { useCallback, useEffect, useState } from "react"
import { alertsApi, vehiclesApi } from "@/services/api"
import type { DailyAlertDTO, MarkAlertSentResultDTO } from "@/services/dto"

export interface PendingAlertRow extends DailyAlertDTO {
  responsables: string[]
}

export function usePendingAlerts() {
  const [alerts, setAlerts] = useState<PendingAlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [pending, myVehicles] = await Promise.all([
        alertsApi.pendingDaily(),
        vehiclesApi.myVehicles(),
      ])

      const responsablesByPlate = new Map<string, string[]>()
      for (const vehicle of myVehicles.vehicles ?? []) {
        responsablesByPlate.set(vehicle.plate, vehicle.responsables ?? [])
      }

      const withResponsables = pending.map((item) => ({
        ...item,
        responsables: responsablesByPlate.get(item.plate) ?? [],
      }))

      setAlerts(withResponsables)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsSent = useCallback(async (plates: string[]): Promise<MarkAlertSentResultDTO> => {
    const result = await alertsApi.markAlertSent(plates)
    setAlerts((prev) => prev.filter((item) => !result.updated.includes(item.plate)))
    return result
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { alerts, loading, error, refetch, markAsSent }
}
