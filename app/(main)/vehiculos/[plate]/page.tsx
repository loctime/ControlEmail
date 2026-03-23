"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { VehicleHeader } from "@/components/vehicles/VehicleHeader"
import { VehicleKpis } from "@/components/vehicles/VehicleKpis"
import { VehicleCharts } from "@/components/vehicles/VehicleCharts"
import { VehicleEventsTable } from "@/components/vehicles/VehicleEventsTable"
import { useVehicleData } from "@/components/vehicles/useVehicleData"
import { LastClosedDateBadge } from "@/components/common/last-closed-date-badge"
import { PageContainer } from "@/components/page-container"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft, MapPin, User } from "lucide-react"
import { formatEventDateTime } from "@/lib/ui/datetime"

export default function VehicleDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const plate = params?.plate as string
  const [daysFilter, setDaysFilter] = useState<7 | 30 | 90>(30)

  const {
    vehicle,
    events,
    visibleEvents,
    speedIncidents,
    totalEventsCount,
    storedEventsCount,
    eventsTruncated,
    kpis,
    score,
    riskLevel,
    trend,
    ranking,
    summary,
    loading,
    error,
  } =
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Detalle de vehiculo {plate.toUpperCase()}</h1>
              <p className="text-sm text-muted-foreground">Analitica, eventos y trazabilidad por patente.</p>
            </div>
          </div>
          <LastClosedDateBadge />
        </div>

        <div className="flex items-center justify-between">
          <Select value={daysFilter.toString()} onValueChange={(value) => setDaysFilter(parseInt(value, 10) as 7 | 30 | 90)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimos 7 dias</SelectItem>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="90">Ultimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <VehicleHeader vehicle={vehicle} riskLevel={riskLevel} score={score} loading={loading} />

        {vehicle && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Driver:</span><span>{vehicle.driver || "No asignado"}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Ultima location:</span><span>{vehicle.lastLocation || "No disponible"}</span></div>
                <div className="flex items-center gap-2"><span className="text-sm font-medium">Ultimo evento:</span><span>{formatEventDateTime(vehicle.lastEventAt)}</span></div>
                <div className="flex items-center gap-2"><span className="text-sm font-medium">Responsables:</span><span>{vehicle.responsables.length > 0 ? vehicle.responsables.join(", ") : "Sin responsables"}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /><p>{error}</p></div>
            </CardContent>
          </Card>
        )}

        {!error && (
          <>
            <VehicleKpis kpis={kpis} score={score} trend={trend} ranking={ranking} loading={loading} />
            <VehicleCharts
              totalEventsCount={totalEventsCount}
              storedEventsCount={storedEventsCount}
              eventsTruncated={eventsTruncated}
              speedIncidents={speedIncidents}
              summary={summary}
              loading={loading}
            />
            <VehicleEventsTable
              events={events}
              speedIncidents={speedIncidents}
              visibleEvents={visibleEvents}
              totalEventsCount={totalEventsCount}
              storedEventsCount={storedEventsCount}
              eventsTruncated={eventsTruncated}
              loading={loading}
            />
          </>
        )}
      </div>
    </PageContainer>
  )
}
