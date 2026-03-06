"use client"

import { Card, CardContent } from "@/components/ui/card"

export function VehiclesContent() {
  return (
    <Card>
      <CardContent className="pt-6 text-sm text-muted-foreground">
        Componente legacy sin uso en la arquitectura principal. Utilizar la ruta /vehiculos del nuevo layout.
      </CardContent>
    </Card>
  )
}
