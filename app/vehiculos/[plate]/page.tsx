"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowLeft, User, MapPin } from "lucide-react"

export default function VehicleDashboardPage() {
  const params = useParams()
  const router = useRouter()
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
        {/* Navegación y título */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard del Vehículo</h1>
            <p className="text-muted-foreground">
              Información completa y eventos de {plate.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Filtro de días */}
        <div className="flex items-center justify-end">
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

        {/* Header del vehículo con riskScore real */}
        <VehicleHeader vehicle={vehicle} riskLevel={riskLevel} score={score} loading={loading} />

        {/* Información adicional del vehículo */}
        {vehicle && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Conductor:</span>
                  <span>{vehicle.driver || "No asignado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Última ubicación:</span>
                  <span>{vehicle.lastLocation || "No disponible"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Último evento:</span>
                  <span>{vehicle.lastEventAt ? new Date(vehicle.lastEventAt).toLocaleString("es-AR") : "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Responsables:</span>
                  <div className="flex flex-wrap gap-1">
                    {vehicle.responsables.length > 0 ? (
                      vehicle.responsables.map((email, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin responsables</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* KPIs y componentes principales */}
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
