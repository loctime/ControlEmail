"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { VehicleAlertRow } from "./vehicle-alert-edit-modal"

type Props = {
  vehicles: VehicleAlertRow[]
  onEdit: (vehicle: VehicleAlertRow) => void
}

export function VehicleAlertsTable({ vehicles, onEdit }: Props) {
  if (vehicles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No hay vehículos.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patente</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Responsables</TableHead>
            <TableHead className="w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.plate || v.id}</TableCell>
              <TableCell>{v.brand || "—"}</TableCell>
              <TableCell>{v.model || "—"}</TableCell>
              <TableCell className="max-w-[240px]">
                <span className="text-muted-foreground text-sm">
                  {Array.isArray(v.responsables) && v.responsables.length > 0
                    ? v.responsables.join(", ")
                    : "—"}
                </span>
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => onEdit(v)}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
