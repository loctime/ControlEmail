"use client"

import { useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { vehiclesApi } from "@/services/api"
import type { MyAlertsVehiclesItemDTO, MyVehiclesItemDTO } from "@/services/api/vehicles/types"
import { queryKeys } from "@/lib/query/queryKeys"

export interface VehicleListRow {
  plate: string
  operationName: string | null
  lastEvent: string
  riskScore: number
  responsables: string[]
}

export function useVehiclesList() {
  const myVehiclesQuery = useQuery({
    queryKey: queryKeys.vehicles.myVehicles(),
    queryFn: () => vehiclesApi.myVehicles(),
    staleTime: 2 * 60_000,
  })

  const alertsVehiclesQuery = useQuery({
    queryKey: queryKeys.vehicles.myAlertsVehicles(),
    queryFn: () => vehiclesApi.myAlertsVehicles(),
    staleTime: 60_000,
  })

  const rows = useMemo(() => {
    const byPlate = new Map<string, MyVehiclesItemDTO>()
    for (const vehicle of myVehiclesQuery.data?.vehicles ?? []) {
      byPlate.set(vehicle.plate, vehicle)
    }

    return (alertsVehiclesQuery.data?.vehicles ?? []).map((item: MyAlertsVehiclesItemDTO) => {
      const vehicle = byPlate.get(item.plate)
      return {
        plate: item.plate,
        operationName: item.operationName ?? vehicle?.operationName ?? null,
        lastEvent: item.lastEvent,
        riskScore: item.riskScore,
        responsables: vehicle?.responsables ?? [],
      }
    })
  }, [alertsVehiclesQuery.data?.vehicles, myVehiclesQuery.data?.vehicles])

  const loading = myVehiclesQuery.isPending || alertsVehiclesQuery.isPending
  const errorObj = myVehiclesQuery.error ?? alertsVehiclesQuery.error
  const error =
    errorObj instanceof Error ? errorObj.message : errorObj ? "Error desconocido" : null

  const refetch = useCallback(async () => {
    await Promise.all([myVehiclesQuery.refetch(), alertsVehiclesQuery.refetch()])
  }, [alertsVehiclesQuery.refetch, myVehiclesQuery.refetch])

  return { rows, loading, error, refetch }
}
