import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { TopVehicle } from "@/services/dashboard-api"

interface TopVehiclesTableProps {
  vehicles: TopVehicle[]
  loading?: boolean
}

export function TopVehiclesTable({ vehicles, loading = false }: TopVehiclesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehiculos con mayor riesgo</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patente</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="text-right">Riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.plate}>
                  <TableCell className="font-medium">{vehicle.plate}</TableCell>
                  <TableCell className="text-right tabular-nums">{vehicle.events}</TableCell>
                  <TableCell className="text-right tabular-nums">{vehicle.riskScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
