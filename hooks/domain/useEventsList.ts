"use client"

import { useCallback, useEffect, useState } from "react"
import { eventsApi } from "@/services/api"
import type { VehicleEventLegacyDTO } from "@/services/api/events/types"

export function useEventsList() {
  const [events, setEvents] = useState<VehicleEventLegacyDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await eventsApi.listGlobal()
      setEvents(Array.isArray(response) ? response : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { events, loading, error, refetch }
}
