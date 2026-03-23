"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { AsyncState } from "@/components/common/async-state"
import { DataTable, type DataTableColumn } from "@/components/tables/data-table"
import { useVehiclesList, type VehicleListRow } from "@/hooks/domain/useVehiclesList"
import { cn } from "@/lib/utils"

const BA_TZ = "America/Argentina/Buenos_Aires"

function formatLastEvent(value: string | null | undefined): string {
  if (!value) return "Sin eventos"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return "Sin eventos"
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: BA_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d)
  } catch {
    return "Sin eventos"
  }
}

function formatResponsables(responsables: string[]): string {
  if (responsables.length === 0) return "Sin responsables"
  const first = (responsables[0] ?? "").split("@")[0] ?? responsables[0] ?? ""
  if (responsables.length === 1) return first
  return `${first} +${responsables.length - 1}`
}

export default function VehiclesPage() {
  const { rows, loading, error, refetch } = useVehiclesList()
  const [search, setSearch] = useState("")
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null)

  const uniqueOperations = useMemo(() => {
    const operations = new Set<string>()
    rows.forEach((row) => {
      if (row.operationName) operations.add(row.operationName)
    })
    return Array.from(operations).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (selectedOperation) {
      result = result.filter((row) => row.operationName === selectedOperation)
    }
    const q = search.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (row) =>
          row.plate.toLowerCase().includes(q) ||
          (row.operationName ?? "").toLowerCase().includes(q) ||
          row.responsables.join(" ").toLowerCase().includes(q),
      )
    }
    return result
  }, [rows, search, selectedOperation])

  const columns: DataTableColumn<VehicleListRow>[] = [
    { key: "plate", header: "Patente", sortable: true, className: "font-mono" },
    { key: "operationName", header: "Operacion", sortable: true },
    {
      key: "lastEvent",
      header: "Ultimo evento",
      sortable: true,
      render: (row) => (
        <span className={cn("tabular-nums", !row.lastEvent && "text-white/30")}>
          {formatLastEvent(row.lastEvent)}
        </span>
      ),
    },
    {
      key: "totalEventsCount",
      header: "Eventos",
      sortable: true,
      render: (row) => <span className="font-semibold tabular-nums">{row.totalEventsCount}</span>,
    },
    {
      key: "riskScore",
      header: "Risk score",
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            "inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums",
            row.riskScore >= 15
              ? "bg-red-500/20 text-red-400"
              : row.riskScore >= 8
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-green-500/20 text-green-400",
          )}
        >
          {row.riskScore}
        </span>
      ),
    },
    {
      key: "responsables",
      header: "Responsables",
      render: (row) => (
        <span
          className={cn(
            "text-sm",
            row.responsables.length === 0 && "text-white/30",
          )}
          title={row.responsables.join(", ")}
        >
          {formatResponsables(row.responsables)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link href={`/vehiculos/${encodeURIComponent(row.plate)}`}>
          <Button size="sm" variant="outline">
            Ver detalle
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Vehiculos</h1>
          <p className="mt-0.5 text-sm text-white/40">Listado consolidado con riesgo y responsables.</p>
        </div>
        <LastClosedDateBadge />
      </div>

      {/* Filtros — sin card wrapper */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedOperation === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedOperation(null)}
          >
            Todas
          </Button>
          {uniqueOperations.map((operation) => (
            <Button
              key={operation}
              variant={selectedOperation === operation ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedOperation(operation)}
            >
              {operation}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por patente, operacion o responsable"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncState
            loading={loading}
            error={error}
            empty={!loading && filtered.length === 0}
            onRetry={() => void refetch()}
          />
          {!loading && !error && filtered.length > 0 && (
            <DataTable
              columns={columns}
              rows={filtered}
              getRowKey={(row) => row.plate}
              pageSize={15}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
