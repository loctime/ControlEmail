"use client"

import { UserX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface RecurrentDriversCardProps {
  /** Driver names that appear in more than one incident/vehicle */
  drivers: string[]
}

export function RecurrentDriversCard({ drivers }: RecurrentDriversCardProps) {
  if (drivers.length === 0) {
    return (
      <Card className="border-white/5 bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white/80">
            Conductores reincidentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/40">Ningún conductor con múltiples incidentes en el período.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/5 bg-white/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UserX size={16} className="text-orange-400/80" />
          <CardTitle className="text-sm font-semibold text-white/80">
            Conductores reincidentes
          </CardTitle>
          <span
            className={cn(
              "rounded border px-2 py-0.5 text-xs font-medium",
              "border-orange-400/20 bg-orange-400/10 text-orange-400",
            )}
          >
            {drivers.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {drivers.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/80"
            >
              <span className="text-orange-400/80">⚠</span>
              {name}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
