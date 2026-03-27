"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/services/api"
import type {
  AdminTotalsDTO,
  DailyBreakdownPointDTO,
  DashboardAggregatedPayload,
  DashboardPeriodDistributionDTO,
  DashboardVehicleDetailDTO,
  TopDriversKeysByOperationDTO,
  MyAlertItemDTO,
  MyRiskItemDTO,
  MyStatsDTO,
} from "@/services/api/dashboard/types"
import type { DailyConsistencyDTO } from "@/services/api/quality/types"
import { queryKeys } from "@/lib/query/queryKeys"

const STALE_TIME_MS = 5 * 60 * 1000

/** `date` del query string según period (dateKey = YYYY-MM-DD) */
function enrichedDateParam(
  dateKey: string,
  mode: "day" | "week" | "month" | "year",
): string {
  if (mode === "day" || mode === "week") return dateKey
  if (mode === "month") return dateKey.slice(0, 7)
  return dateKey.slice(0, 4)
}

/** Normalize aggregated stats to the shape expected by the UI (MyStatsDTO.stats) */
function normalizeDistribution(
  payload: DashboardAggregatedPayload | undefined,
): DashboardPeriodDistributionDTO | null {
  const d = payload?.distribution
  if (d == null || typeof d !== "object") return null
  return {
    excesos: d.excesos,
    llave_sin_cargar: d.llave_sin_cargar,
    no_identificados: d.no_identificados,
    contactos: d.contactos,
    conductor_inactivo: d.conductor_inactivo,
  }
}

/** El endpoint enrich suele devolver `vehicleDetails`, no `vehicles`. Se mapea a la forma de ranking de riesgo. */
function riskVehiclesFromVehicleDetails(details: DashboardVehicleDetailDTO[]): MyRiskItemDTO[] {
  return details
    .map((v) => {
      const alerts =
        (v.excesos ?? 0) +
        (v.llave_sin_cargar ?? 0) +
        (v.no_identificados ?? 0) +
        (v.conductor_inactivo ?? 0) +
        (v.contactos ?? 0)
      return {
        plate: v.plate,
        alerts,
        maxRisk: v.excesos ?? 0,
      }
    })
    .filter((v) => v.alerts > 0)
    .sort(
      (a, b) =>
        b.maxRisk - a.maxRisk || b.alerts - a.alerts || a.plate.localeCompare(b.plate),
    )
}

function normalizeStats(
  payload: DashboardAggregatedPayload | undefined,
): MyStatsDTO["stats"] | null {
  if (!payload?.stats) return null
  const s = payload.stats
  return {
    totalAlerts: s.totalAlerts ?? 0,
    alertsToday: s.totalAlerts ?? 0,
    alertsPending: s.alertsPending ?? 0,
    alertsSent: s.alertsSent ?? 0,
    maxRisk: s.maxRisk ?? 0,
    avgRisk: s.avgRisk ?? 0,
  }
}

export interface DashboardDataState {
  stats: MyStatsDTO["stats"] | null
  riskVehicles: MyRiskItemDTO[]
  pendingAlerts: MyAlertItemDTO[]
  consistency: DailyConsistencyDTO | null
  /** SuperDashboard: per-vehicle enriched data */
  vehicleDetails: DashboardVehicleDetailDTO[]
  /** SuperDashboard: top llaves/conductores agregado por operación */
  topDriversKeysByOperation: TopDriversKeysByOperationDTO[]
  /** SuperDashboard: admin alert category totals */
  adminTotals: AdminTotalsDTO | null
  /** SuperDashboard: serie diaria de excesos (semana, mes, año cuando el API la envía) */
  dailyBreakdown: DailyBreakdownPointDTO[] | null
  /** Totales del período por categoría (cuando el backend los envía en `distribution`) */
  distribution: DashboardPeriodDistributionDTO | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboardData(
  dateKey: string | undefined,
  mode: "day" | "week" | "month" | "year",
): DashboardDataState {
  const param = dateKey ? enrichedDateParam(dateKey, mode) : ""

  const query = useQuery({
    queryKey: queryKeys.dashboard.aggregated(mode, param),
    queryFn: async (): Promise<{
      stats: MyStatsDTO["stats"] | null
      riskVehicles: MyRiskItemDTO[]
      pendingAlerts: MyAlertItemDTO[]
      consistency: DailyConsistencyDTO | null
      vehicleDetails: DashboardVehicleDetailDTO[]
      topDriversKeysByOperation: TopDriversKeysByOperationDTO[]
      adminTotals: AdminTotalsDTO | null
      dailyBreakdown: DailyBreakdownPointDTO[] | null
      distribution: DashboardPeriodDistributionDTO | null
    }> => {
      if (!dateKey) {
        return {
          stats: null,
          riskVehicles: [],
          pendingAlerts: [],
          consistency: null,
          vehicleDetails: [],
          topDriversKeysByOperation: [],
          adminTotals: null,
          dailyBreakdown: null,
          distribution: null,
        }
      }

      const dateParam = enrichedDateParam(dateKey, mode)
      const payload = await dashboardApi.getEnriched(mode, dateParam)

      const vehicleDetails = Array.isArray(payload.vehicleDetails) ? payload.vehicleDetails : []

      return {
        stats: normalizeStats(payload),
        riskVehicles: riskVehiclesFromVehicleDetails(vehicleDetails),
        pendingAlerts: Array.isArray(payload.pendingAlerts)
          ? payload.pendingAlerts.filter((a) => !a.alertSent)
          : [],
        consistency: payload.consistency ?? null,
        vehicleDetails,
        topDriversKeysByOperation: Array.isArray(payload.topDriversKeysByOperation)
          ? payload.topDriversKeysByOperation
          : [],
        adminTotals: payload.adminTotals ?? null,
        dailyBreakdown: Array.isArray(payload.dailyBreakdown) ? payload.dailyBreakdown : null,
        distribution: normalizeDistribution(payload),
      }
    },
    enabled: !!dateKey,
    staleTime: STALE_TIME_MS,
  })

  const refetch = useCallback(async () => {
    await query.refetch()
  }, [query.refetch])

  return {
    stats: query.data?.stats ?? null,
    riskVehicles: query.data?.riskVehicles ?? [],
    pendingAlerts: query.data?.pendingAlerts ?? [],
    consistency: query.data?.consistency ?? null,
    vehicleDetails: query.data?.vehicleDetails ?? [],
    topDriversKeysByOperation: query.data?.topDriversKeysByOperation ?? [],
    adminTotals: query.data?.adminTotals ?? null,
    dailyBreakdown: query.data?.dailyBreakdown ?? null,
    distribution: query.data?.distribution ?? null,
    loading: query.isPending,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Error desconocido"
          : null,
    refetch,
  }
}
