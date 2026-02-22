"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Car } from "lucide-react"
import type { VehicleDoc } from "@/lib/firestore-read"
import { cn } from "@/lib/utils"

interface VehicleHeaderProps {
  vehicle: VehicleDoc | null
  riskLevel: "bajo" | "medio" | "alto"
  loading: boolean
}

export function VehicleHeader({ vehicle, riskLevel, loading }: VehicleHeaderProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!vehicle) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>Vehículo no encontrado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const riskColors = {
    bajo: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    medio: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    alto: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  }

  const riskLabels = {
    bajo: "Riesgo Bajo",
    medio: "Riesgo Medio",
    alto: "Riesgo Alto",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{vehicle.plate}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {vehicle.brand && vehicle.model
                  ? `${vehicle.brand} ${vehicle.model}`
                  : "Sin información del vehículo"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-sm font-semibold px-3 py-1", riskColors[riskLevel])}
          >
            {riskLabels[riskLevel]}
          </Badge>
        </div>
      </CardHeader>
      {vehicle.responsables && vehicle.responsables.length > 0 && (
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Responsables:</span>
            {vehicle.responsables.map((email, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {email}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
