"use client"

import { useCallback, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { alertsApi, vehiclesApi } from "@/services/api"
import type { DailyAlertDTO, MarkAlertSentResultDTO } from "@/services/api/alerts/types"
import { queryKeys } from "@/lib/query/queryKeys"

export interface PendingAlertRow extends DailyAlertDTO {
  responsables: string[]
}

export function usePendingAlerts() {
  const queryClient = useQueryClient()

  const pendingQuery = useQuery({
    queryKey: queryKeys.alerts.pendingDaily(),
    queryFn: () => alertsApi.pendingDaily(),
    staleTime: 30_000,
  })

  const myVehiclesQuery = useQuery({
    queryKey: queryKeys.vehicles.myVehicles(),
    queryFn: () => vehiclesApi.myVehicles(),
    staleTime: 2 * 60_000,
  })

  const alerts = useMemo<PendingAlertRow[]>(() => {
    const responsablesByPlate = new Map<string, string[]>()
    for (const vehicle of myVehiclesQuery.data?.vehicles ?? []) {
      responsablesByPlate.set(vehicle.plate, vehicle.responsables ?? [])
    }

    return (pendingQuery.data ?? []).map((item) => ({
      ...item,
      responsables: responsablesByPlate.get(item.plate) ?? [],
    }))
  }, [myVehiclesQuery.data?.vehicles, pendingQuery.data])

  const errorObj = pendingQuery.error ?? myVehiclesQuery.error
  const error =
    errorObj instanceof Error ? errorObj.message : errorObj ? "Error desconocido" : null

  const loading = pendingQuery.isPending || myVehiclesQuery.isPending

  const markMutation = useMutation({
    mutationFn: (plates: string[]) => alertsApi.markAlertSent(plates),
    onSuccess: (result) => {
      queryClient.setQueryData<DailyAlertDTO[] | undefined>(queryKeys.alerts.pendingDaily(), (old) => {
        if (!old) return old
        const updated = new Set(result.updated)
        return old.filter((item) => !updated.has(item.plate))
      })

      void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.myAlertsVehicles() })
    },
  })

  const markAsSent = useCallback(
    async (plates: string[]): Promise<MarkAlertSentResultDTO> => {
      return await markMutation.mutateAsync(plates)
    },
    [markMutation.mutateAsync],
  )

  const refetch = useCallback(async () => {
    await Promise.all([pendingQuery.refetch(), myVehiclesQuery.refetch()])
  }, [myVehiclesQuery.refetch, pendingQuery.refetch])

  return { alerts, loading, error, refetch, markAsSent }
}
