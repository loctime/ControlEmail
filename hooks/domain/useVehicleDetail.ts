"use client"

import { useEffect, useState } from "react"
import { vehicleDetailService } from "@/services/vehicleDetailService"
import type { VehicleDetailDTO } from "@/services/dto"

interface UseVehicleDetailResult {
  data: VehicleDetailDTO | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useVehicleDetail(vehicleId: string | null): UseVehicleDetailResult {
  const [data, setData] = useState<VehicleDetailDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!vehicleId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const detail = await vehicleDetailService.getVehicleDetail(vehicleId)
        setData(detail)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [vehicleId, version])

  const refetch = () => setVersion((v) => v + 1)

  return { data, loading, error, refetch }
}

