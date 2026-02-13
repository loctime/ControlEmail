"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface VehicleAlertRow {
  id: string
  plate: string
  brand: string
  model: string
  responsables: string[]
  alertEnabled: boolean
}

type Props = {
  open: boolean
  vehicle: VehicleAlertRow | null
  onClose: () => void
  onSave: (plate: string, payload: { responsables: string[]; alertEnabled: boolean }) => Promise<void>
}

export function VehicleAlertEditModal({ open, vehicle, onClose, onSave }: Props) {
  const [responsables, setResponsables] = useState<string[]>([])
  const [alertEnabled, setAlertEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newEmail, setNewEmail] = useState("")

  useEffect(() => {
    if (vehicle) {
      setResponsables(vehicle.responsables ?? [])
      setAlertEnabled(vehicle.alertEnabled ?? false)
    }
    setNewEmail("")
  }, [vehicle, open])

  const addEmail = () => {
    const email = newEmail.trim()
    if (email && !responsables.includes(email)) {
      setResponsables([...responsables, email])
      setNewEmail("")
    }
  }

  const removeEmail = (index: number) => {
    setResponsables(responsables.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!vehicle) return
    setSaving(true)
    try {
      await onSave(vehicle.plate || vehicle.id, {
        responsables: responsables.filter(Boolean),
        alertEnabled,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!vehicle) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar alertas — {vehicle.plate || vehicle.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Alertas habilitadas</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="alert-enabled"
                checked={alertEnabled}
                onCheckedChange={setAlertEnabled}
              />
              <label htmlFor="alert-enabled" className="text-sm text-muted-foreground">
                {alertEnabled ? "Sí" : "No"}
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsables (emails)</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
              />
              <Button type="button" variant="secondary" onClick={addEmail} size="sm">
                Agregar
              </Button>
            </div>
            <ul className="mt-2 space-y-1 rounded-md border bg-muted/30 p-2 max-h-40 overflow-auto">
              {responsables.length === 0 ? (
                <li className="text-sm text-muted-foreground">Ninguno</li>
              ) : (
                responsables.map((email, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded px-2 py-1 text-sm",
                      "bg-background",
                    )}
                  >
                    <span className="truncate">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeEmail(i)}
                    >
                      Quitar
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
