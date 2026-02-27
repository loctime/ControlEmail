"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Mail, CheckCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { DashboardKpis, TopVehicles, useDailyMetrics } from "@/features/email-dashboard"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const { data, loading, error } = useDailyMetrics(format(selectedDate, "yyyy-MM-dd"))

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Alertas</h1>
          <p className="text-muted-foreground">
            Métricas y estado actual del sistema de alertas de vehículos
          </p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <DashboardKpis data={data} loading={loading} />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <TopVehicles data={data} loading={loading} />
          
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Envíos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded"></div>
                  ))}
                </div>
              ) : data ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total alertas generadas</span>
                    <span className="font-bold">{data.vehicles.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alertas enviadas</span>
                    <Badge variant="default">
                      {data.vehicles.filter(v => v.alertSent).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pendientes de envío</span>
                    <Badge variant={data.vehicles.filter(v => !v.alertSent).length > 0 ? "destructive" : "secondary"}>
                      {data.vehicles.filter(v => !v.alertSent).length}
                    </Badge>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
