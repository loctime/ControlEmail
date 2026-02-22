"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { VehicleHeader } from "@/components/vehicles/VehicleHeader"
import { VehicleKpis } from "@/components/vehicles/VehicleKpis"
import { VehicleCharts } from "@/components/vehicles/VehicleCharts"
import { VehicleEventsTable } from "@/components/vehicles/VehicleEventsTable"
import { useVehicleData } from "@/components/vehicles/useVehicleData"
import { PageContainer } from "@/components/page-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function VehicleDashboardPage() {
  const params = useParams()
  const plate = params?.plate as string
  const [daysFilter, setDaysFilter] = useState<7 | 30 | 90>(30)

  const { vehicle, filteredEvents, kpis, score, riskLevel, trend, ranking, monthlyScores, loading, error } =
    useVehicleData(plate, daysFilter)

  if (!plate) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>Patente no especificada</p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Filtro de días */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard del Vehículo</h1>
          <Select
            value={daysFilter.toString()}
            onValueChange={(value) => setDaysFilter(parseInt(value, 10) as 7 | 30 | 90)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Header del vehículo */}
        <VehicleHeader vehicle={vehicle} riskLevel={riskLevel} loading={loading} />

        {/* Mensaje de error */}
        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        {!error && (
          <>
            <VehicleKpis kpis={kpis} score={score} trend={trend} ranking={ranking} loading={loading} />

            {/* Gráficos */}
            <VehicleCharts events={filteredEvents} monthlyScores={monthlyScores} loading={loading} />

            {/* Tabla de eventos */}
            <VehicleEventsTable events={filteredEvents} loading={loading} />
          </>
        )}
      </div>
    </PageContainer>
  )
}
