"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export function SettingsContent() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold">Configuracion</h2>
        <p className="text-xs text-muted-foreground">
          Preferencias del sistema de control vehicular
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notificaciones</CardTitle>
          <CardDescription className="text-xs">
            Configura que alertas deseas recibir
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed" className="text-xs flex flex-col gap-0.5">
              <span>Excesos de velocidad</span>
              <span className="font-normal text-muted-foreground">
                Recibir alertas cuando un vehiculo supere el limite
              </span>
            </Label>
            <Switch id="speed" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="unid" className="text-xs flex flex-col gap-0.5">
              <span>Vehiculos no identificados</span>
              <span className="font-normal text-muted-foreground">
                Alertas por vehiculos sin registro en el sistema
              </span>
            </Label>
            <Switch id="unid" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="route" className="text-xs flex flex-col gap-0.5">
              <span>Desvios de ruta</span>
              <span className="font-normal text-muted-foreground">
                Notificar cuando un vehiculo se desvie del trayecto
              </span>
            </Label>
            <Switch id="route" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="night" className="text-xs flex flex-col gap-0.5">
              <span>Conduccion nocturna</span>
              <span className="font-normal text-muted-foreground">
                Alertar circulacion fuera de horario autorizado
              </span>
            </Label>
            <Switch id="night" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sistema</CardTitle>
          <CardDescription className="text-xs">
            Parametros generales de la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sounds" className="text-xs flex flex-col gap-0.5">
              <span>Sonidos de alerta</span>
              <span className="font-normal text-muted-foreground">
                Reproducir sonido al recibir alerta critica
              </span>
            </Label>
            <Switch id="sounds" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="auto" className="text-xs flex flex-col gap-0.5">
              <span>Actualizacion automatica</span>
              <span className="font-normal text-muted-foreground">
                Refrescar datos cada 30 segundos
              </span>
            </Label>
            <Switch id="auto" defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
