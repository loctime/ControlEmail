"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminTotalsDTO, DashboardVehicleDetailDTO } from "@/services/api/dashboard/types"

export interface AdminAlertsCardProps {
  totals: AdminTotalsDTO
  /** Vehicles with at least one admin alert (for the table) */
  affectedVehicles: DashboardVehicleDetailDTO[]
}

const CATEGORIES: { key: keyof AdminTotalsDTO; label: string }[] = [
  { key: "llave_sin_cargar", label: "Llave sin cargar" },
  { key: "no_identificados", label: "No identificados" },
  { key: "contactos", label: "Contactos" },
  { key: "conductor_inactivo", label: "Conductor inactivo" },
]

export function AdminAlertsCard({ totals, affectedVehicles }: AdminAlertsCardProps) {
  const hasAnyTotal =
    totals.llave_sin_cargar > 0 ||
    totals.no_identificados > 0 ||
    totals.contactos > 0 ||
    totals.conductor_inactivo > 0

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-white/80">
          Alertas administrativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <p className="text-xs text-white/40">{label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-white">
                {totals[key]}
              </p>
            </div>
          ))}
        </div>

        {affectedVehicles.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-white/50">
              Vehículos afectados ({affectedVehicles.length})
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-3 py-2 font-medium text-white/60">Patente</th>
                    <th className="px-3 py-2 font-medium text-white/60">Llave</th>
                    <th className="px-3 py-2 font-medium text-white/60">No id.</th>
                    <th className="px-3 py-2 font-medium text-white/60">Contactos</th>
                    <th className="px-3 py-2 font-medium text-white/60">Inactivo</th>
                  </tr>
                </thead>
                <tbody>
                  {affectedVehicles.slice(0, 20).map((v) => (
                    <tr
                      key={v.plate}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="font-mono px-3 py-2 text-white/90">{v.plate}</td>
                      <td className="px-3 py-2 tabular-nums text-white/70">
                        {v.llave_sin_cargar}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-white/70">
                        {v.no_identificados}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-white/70">
                        {v.contactos}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-white/70">
                        {v.conductor_inactivo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {affectedVehicles.length > 20 && (
              <p className="mt-1.5 text-xs text-white/30">
                Mostrando 20 de {affectedVehicles.length} vehículos
              </p>
            )}
          </div>
        )}

        {!hasAnyTotal && (
          <p className="text-sm text-white/40">Sin alertas administrativas en el período.</p>
        )}
      </CardContent>
    </Card>
  )
}
