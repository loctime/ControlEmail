import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function SettingsContent() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Configuracion del sistema</h1>
        <p className="text-sm text-muted-foreground">
          Esta pantalla no simula reglas inexistentes. Muestra configuraciones reales y accesos administrativos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de negocio activas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Los datos consolidados del sistema corresponden al ultimo cierre disponible (ayer).</p>
          <p>Las vistas historicas y de calidad no permiten fechas futuras ni el dia actual.</p>
          <Badge variant="outline">TODO backend: reglas configurables de riesgo por operacion</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accesos administrativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <Link className="underline" href="/admin/email-config">
              Administrar destinatarios de correo
            </Link>
          </p>
          <p>
            <Link className="underline" href="/admin/vehicle-alerts">
              Administrar responsables por vehiculo
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
