"use client"

import { useMemo } from "react"
import { AdminAlertsCard } from "@/components/dashboard/AdminAlertsCard"
import type { AdminTotalsDTO, DashboardVehicleDetailDTO } from "@/services/api/dashboard/types"

export interface AdminAlertsTabProps {
  adminTotals: AdminTotalsDTO | null
  vehicleDetails: DashboardVehicleDetailDTO[]
}

export function AdminAlertsTab({ adminTotals, vehicleDetails }: AdminAlertsTabProps) {
  const affectedVehicles = useMemo(() => {
    return vehicleDetails.filter(
      (v) =>
        v.llave_sin_cargar > 0 ||
        v.no_identificados > 0 ||
        v.contactos > 0 ||
        v.conductor_inactivo > 0,
    )
  }, [vehicleDetails])

  const totals: AdminTotalsDTO = adminTotals ?? {
    llave_sin_cargar: 0,
    no_identificados: 0,
    contactos: 0,
    conductor_inactivo: 0,
  }

  return (
    <div className="space-y-4">
      <AdminAlertsCard totals={totals} affectedVehicles={affectedVehicles} />
    </div>
  )
}
