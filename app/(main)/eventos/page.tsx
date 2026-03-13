"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AsyncState } from "@/components/common/async-state"
import { DataTable, type DataTableColumn } from "@/components/tables/data-table"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { useEventsList } from "@/hooks/domain/useEventsList"
import { getLastClosedDateKey } from "@/lib/domain/closed-date"
import type { VehicleEventLegacyDTO } from "@/services/api/events/types"

function severityFromStatus(status: VehicleEventLegacyDTO["estado"]): "ALTA" | "MEDIA" | "BAJA" {
  if (status === "critico") return "ALTA"
  if (status === "en_revision") return "MEDIA"
  return "BAJA"
}

export default function EventosPage() {
  const { events, loading, error, refetch } = useEventsList()
  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("all")
  const [type, setType] = useState("all")
  const [date, setDate] = useState("")

  const maxDate = getLastClosedDateKey()

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          event.patente.toLowerCase().includes(q) ||
          (event.conductor ?? "").toLowerCase().includes(q) ||
          (event.ubicacion ?? "").toLowerCase().includes(q)
        if (!matches) return false
      }

      if (severity !== "all" && severityFromStatus(event.estado) !== severity) return false
      if (type !== "all" && event.tipo !== type) return false
      if (date && event.fecha !== date) return false
      if (event.fecha > maxDate) return false
      return true
    })
  }, [date, events, maxDate, search, severity, type])

  const columns: DataTableColumn<VehicleEventLegacyDTO>[] = [
    { key: "fecha", header: "Fecha", sortable: true },
    { key: "hora", header: "Hora", sortable: true },
    { key: "patente", header: "Patente", sortable: true },
    { key: "tipo", header: "Tipo", sortable: true },
    {
      key: "estado",
      header: "Severidad",
      sortable: true,
      render: (row) => <Badge variant={row.estado === "critico" ? "destructive" : "outline"}>{severityFromStatus(row.estado)}</Badge>,
    },
    { key: "conductor", header: "Driver" },
    { key: "ubicacion", header: "Location" },
    { key: "descripcion", header: "Reason" },
    {
      key: "actions",
      header: "Acciones",
      render: (row) => (
        <Link href={`/vehiculos/${encodeURIComponent(row.patente)}`}>
          <Button variant="outline" size="sm">
            Ver vehiculo
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Eventos globales</h1>
          <p className="text-sm text-muted-foreground">Vista consolidada de eventos. TODO tecnico: migrar a endpoint my-*.</p>
        </div>
        <LastClosedDateBadge />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Buscar patente/driver/location" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger><SelectValue placeholder="Severidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="ALTA">Alta</SelectItem>
              <SelectItem value="MEDIA">Media</SelectItem>
              <SelectItem value="BAJA">Baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="exceso_velocidad">Exceso velocidad</SelectItem>
              <SelectItem value="vehiculo_no_identificado">No identificado</SelectItem>
              <SelectItem value="desvio_ruta">Desvio ruta</SelectItem>
              <SelectItem value="parada_no_autorizada">Parada no autorizada</SelectItem>
              <SelectItem value="conduccion_nocturna">Conduccion nocturna</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={date} max={maxDate} onChange={(e) => setDate(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filas visibles ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncState loading={loading} error={error} empty={!loading && filtered.length === 0} onRetry={() => void refetch()} />
          {!loading && !error && filtered.length > 0 && <DataTable columns={columns} rows={filtered} getRowKey={(row) => row.id} pageSize={12} />}
        </CardContent>
      </Card>
    </div>
  )
}
