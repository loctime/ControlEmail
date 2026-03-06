"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { AsyncState } from "@/components/common/async-state"
import { DataTable, type DataTableColumn } from "@/components/tables/data-table"
import { useVehiclesList, type VehicleListRow } from "@/hooks/domain/useVehiclesList"

export default function VehiclesPage() {
  const { rows, loading, error, refetch } = useVehiclesList()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return rows
    return rows.filter((row) =>
      row.plate.toLowerCase().includes(q) ||
      (row.operationName ?? "").toLowerCase().includes(q) ||
      row.responsables.join(" ").toLowerCase().includes(q),
    )
  }, [rows, search])

  const columns: DataTableColumn<VehicleListRow>[] = [
    { key: "plate", header: "Patente", sortable: true, className: "font-mono" },
    { key: "operationName", header: "Operacion", sortable: true },
    { key: "lastEvent", header: "Ultimo evento", sortable: true },
    {
      key: "riskScore",
      header: "Risk score",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">{row.riskScore}</span>
          {row.riskScore > 15 && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </div>
      ),
    },
    {
      key: "responsables",
      header: "Responsables",
      render: (row) => row.responsables.length > 0 ? row.responsables.join(", ") : "Sin responsables",
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <Badge variant={row.riskScore >= 15 ? "destructive" : row.riskScore >= 8 ? "outline" : "secondary"}>
          {row.riskScore >= 15 ? "Critico" : row.riskScore >= 8 ? "Observacion" : "Estable"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (row) => (
        <Link href={`/vehiculos/${encodeURIComponent(row.plate)}`}>
          <Button size="sm" variant="outline">Ver detalle</Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vehiculos</h1>
          <p className="text-sm text-muted-foreground">Listado consolidado con riesgo y responsables.</p>
        </div>
        <LastClosedDateBadge />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Buscar por patente, operacion o responsable" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline" onClick={() => void refetch()} disabled={loading}>Actualizar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncState loading={loading} error={error} empty={!loading && filtered.length === 0} onRetry={() => void refetch()} />
          {!loading && !error && filtered.length > 0 && <DataTable columns={columns} rows={filtered} getRowKey={(row) => row.plate} pageSize={15} />}
        </CardContent>
      </Card>
    </div>
  )
}
