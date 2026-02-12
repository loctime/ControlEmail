"use client"

import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
  AppCardContent,
} from "@/components/app-card"
import { PageContainer } from "@/components/page-container"
import { SectionHeader } from "@/components/section-header"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export function SettingsContent() {
  return (
    <PageContainer>
      <SectionHeader
        title="Configuracion"
        description="Preferencias del sistema de control vehicular"
      />

      <AppCard className="flex flex-col">
        <AppCardHeader className="pb-3">
          <AppCardTitle className="text-base">Notificaciones</AppCardTitle>
          <AppCardDescription className="text-sm">
            Configura que alertas deseas recibir
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed" className="flex flex-col gap-0.5 text-sm">
              <span>Excesos de velocidad</span>
              <span className="font-normal text-muted-foreground">
                Recibir alertas cuando un vehiculo supere el limite
              </span>
            </Label>
            <Switch id="speed" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="unid" className="flex flex-col gap-0.5 text-sm">
              <span>Vehiculos no identificados</span>
              <span className="font-normal text-muted-foreground">
                Alertas por vehiculos sin registro en el sistema
              </span>
            </Label>
            <Switch id="unid" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="route" className="flex flex-col gap-0.5 text-sm">
              <span>Desvios de ruta</span>
              <span className="font-normal text-muted-foreground">
                Notificar cuando un vehiculo se desvie del trayecto
              </span>
            </Label>
            <Switch id="route" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="night" className="flex flex-col gap-0.5 text-sm">
              <span>Conduccion nocturna</span>
              <span className="font-normal text-muted-foreground">
                Alertar circulacion fuera de horario autorizado
              </span>
            </Label>
            <Switch id="night" />
          </div>
        </AppCardContent>
      </AppCard>

      <AppCard className="flex flex-col">
        <AppCardHeader className="pb-3">
          <AppCardTitle className="text-base">Sistema</AppCardTitle>
          <AppCardDescription className="text-sm">
            Parametros generales de la plataforma
          </AppCardDescription>
        </AppCardHeader>
        <AppCardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sounds" className="flex flex-col gap-0.5 text-sm">
              <span>Sonidos de alerta</span>
              <span className="font-normal text-muted-foreground">
                Reproducir sonido al recibir alerta critica
              </span>
            </Label>
            <Switch id="sounds" defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="auto" className="flex flex-col gap-0.5 text-sm">
              <span>Actualizacion automatica</span>
              <span className="font-normal text-muted-foreground">
                Refrescar datos cada 30 segundos
              </span>
            </Label>
            <Switch id="auto" defaultChecked />
          </div>
        </AppCardContent>
      </AppCard>
    </PageContainer>
  )
}
