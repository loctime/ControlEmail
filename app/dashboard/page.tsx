"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { emailFrontendApi } from "@/services/emailFrontendApi"
import type { MyRiskDTO, MyStatsDTO, MyAlertsVehiclesDTO } from "@/services/dto"

export default function DashboardPage() {
  const [stats, setStats] = useState<MyStatsDTO["stats"] | null>(null)
  const [risk, setRisk] = useState<MyRiskDTO["vehicles"]>([])
  const [vehicles, setVehicles] = useState<MyAlertsVehiclesDTO["vehicles"]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, riskRes, vehiclesRes] = await Promise.all([
        emailFrontendApi.myStats(),
        emailFrontendApi.myRisk(),
        emailFrontendApi.myAlertsVehicles(),
      ])
      setStats(statsRes.stats)
      setRisk(riskRes.vehicles)
      setVehicles(vehiclesRes.vehicles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setStats(null)
      setRisk([])
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Alertas</h1>
          <p className="text-muted-foreground">Resumen basado en endpoints my-*</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Actualizar</Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard title="Total" value={stats?.totalAlerts} loading={loading} />
        <KpiCard title="Hoy" value={stats?.alertsToday} loading={loading} />
        <KpiCard title="Pendientes" value={stats?.alertsPending} loading={loading} />
        <KpiCard title="Enviadas" value={stats?.alertsSent} loading={loading} />
        <KpiCard title="Max Risk" value={stats?.maxRisk} loading={loading} />
        <KpiCard title="Avg Risk" value={stats?.avgRisk} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Riesgo por patente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {risk.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              risk.slice(0, 10).map((item) => (
                <div key={item.plate} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span className="font-mono">{item.plate}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Eventos: {item.alerts}</Badge>
                    <Badge>{item.maxRisk}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehiculos de alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              vehicles.slice(0, 10).map((vehicle) => (
                <div key={vehicle.plate} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <div>
                    <p className="font-mono">{vehicle.plate}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.lastEvent}</p>
                  </div>
                  <Badge>{vehicle.riskScore}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ title, value, loading }: { title: string; value: number | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{loading ? "..." : value ?? 0}</p>
      </CardContent>
    </Card>
  )
}
