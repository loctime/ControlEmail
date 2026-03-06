"use client"

import { useCallback, useEffect, useState } from "react"
import { vehiclesApi } from "@/services/api"
import type { MyAlertsVehiclesItemDTO, MyVehiclesItemDTO } from "@/services/api/vehicles/types"

export interface VehicleListRow {
  plate: string
  operationName: string | null
  lastEvent: string
  riskScore: number
  responsables: string[]
}

export function useVehiclesList() {
  const [rows, setRows] = useState<VehicleListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [alertsVehicles, myVehicles] = await Promise.all([
        vehiclesApi.myAlertsVehicles(),
        vehiclesApi.myVehicles(),
      ])

      const byPlate = new Map<string, MyVehiclesItemDTO>()
      for (const vehicle of myVehicles.vehicles ?? []) {
        byPlate.set(vehicle.plate, vehicle)
      }

      const merged = (alertsVehicles.vehicles ?? []).map((item: MyAlertsVehiclesItemDTO) => {
        const vehicle = byPlate.get(item.plate)
        return {
          plate: item.plate,
          operationName: item.operationName ?? vehicle?.operationName ?? null,
          lastEvent: item.lastEvent,
          riskScore: item.riskScore,
          responsables: vehicle?.responsables ?? [],
        }
      })

      setRows(merged)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { rows, loading, error, refetch }
}
