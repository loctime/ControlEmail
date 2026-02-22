"use client"

import { useState, useEffect, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus } from "lucide-react"
import { normalizePlate } from "@/lib/utils"

export interface VehicleAlertRow {
  id: string
  plate: string
  brand?: string
  model?: string
  responsables: string[]
}

type Props = {
  vehicles: VehicleAlertRow[]
  onSave: (plate: string, payload: { responsables: string[] }) => Promise<void>
}

export function VehicleAlertsTable({ vehicles, onSave }: Props) {
  const [editingResponsables, setEditingResponsables] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newPlate, setNewPlate] = useState("")
  const [newResponsables, setNewResponsables] = useState<string[]>([])
  const [savingNew, setSavingNew] = useState(false)
  const [errorNew, setErrorNew] = useState<string | null>(null)
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Inicializar estado de edición con los valores actuales cuando se enfoca
  const initializeEditing = (plate: string, currentResponsables: string[]) => {
    if (editingResponsables[plate] === undefined) {
      setEditingResponsables((prev) => ({
        ...prev,
        [plate]: [...currentResponsables],
      }))
    }
  }

  // Guardar cambios con debounce
  const scheduleSave = (plate: string, responsables: string[]) => {
    // Limpiar timeout anterior si existe
    if (saveTimeoutRef.current[plate]) {
      clearTimeout(saveTimeoutRef.current[plate])
    }

    // Programar guardado después de 500ms de inactividad
    saveTimeoutRef.current[plate] = setTimeout(async () => {
      setSaving((prev) => ({ ...prev, [plate]: true }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next[plate]
        return next
      })

      try {
        await onSave(plate, { responsables: responsables.filter(Boolean) })
        // No limpiar editingResponsables para mantener el estado visual
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [plate]: error instanceof Error ? error.message : "Error al guardar",
        }))
      } finally {
        setSaving((prev) => {
          const next = { ...prev }
          delete next[plate]
          return next
        })
      }
    }, 500)
  }

  const handleEmailChange = (plate: string, index: number, value: string) => {
    setEditingResponsables((prev) => {
      const current = prev[plate] || []
      const updated = [...current]
      updated[index] = value.trim()
      const newState = { ...prev, [plate]: updated }
      scheduleSave(plate, updated)
      return newState
    })
  }

  const handleAddEmail = (plate: string) => {
    setEditingResponsables((prev) => {
      const current = prev[plate] || []
      const updated = [...current, ""]
      return { ...prev, [plate]: updated }
    })
  }

  const handleRemoveEmail = (plate: string, index: number) => {
    setEditingResponsables((prev) => {
      const current = prev[plate] || []
      const updated = current.filter((_, i) => i !== index)
      scheduleSave(plate, updated)
      return { ...prev, [plate]: updated }
    })
  }

  const handleBlur = (plate: string) => {
    // Guardar inmediatamente al hacer blur
    const responsables = editingResponsables[plate]
    if (responsables) {
      if (saveTimeoutRef.current[plate]) {
        clearTimeout(saveTimeoutRef.current[plate])
      }
      scheduleSave(plate, responsables)
    }
  }

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach((timeout) => {
        clearTimeout(timeout)
      })
    }
  }, [])

  const handleAddNew = async () => {
    const normalizedPlate = normalizePlate(newPlate)
    if (!normalizedPlate) {
      setErrorNew("La patente es requerida")
      return
    }

    const responsables = newResponsables.filter(Boolean)
    setSavingNew(true)
    setErrorNew(null)

    try {
      await onSave(normalizedPlate, { responsables })
      setNewPlate("")
      setNewResponsables([])
      setIsAddingNew(false)
    } catch (error) {
      setErrorNew(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setSavingNew(false)
    }
  }

  const handleNewEmailChange = (index: number, value: string) => {
    setNewResponsables((prev) => {
      const updated = [...prev]
      updated[index] = value.trim()
      return updated
    })
  }

  const handleAddNewEmail = () => {
    setNewResponsables((prev) => [...prev, ""])
  }

  const handleRemoveNewEmail = (index: number) => {
    setNewResponsables((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patente</TableHead>
            <TableHead>Responsables</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => {
            const plate = v.plate || v.id
            const currentResponsables = editingResponsables[plate] ?? v.responsables ?? []
            const isSaving = saving[plate] === true
            const error = errors[plate]

            return (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{plate}</TableCell>
                <TableCell>
                  <div className="space-y-2 min-w-[400px]">
                    <div className="flex flex-col gap-2">
                      {currentResponsables.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailChange(plate, index, e.target.value)}
                            onFocus={() => initializeEditing(plate, v.responsables ?? [])}
                            onBlur={() => handleBlur(plate)}
                            placeholder="email@ejemplo.com"
                            disabled={isSaving}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEmail(plate, index)}
                            disabled={isSaving}
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Eliminar email"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          initializeEditing(plate, v.responsables ?? [])
                          handleAddEmail(plate)
                        }}
                        disabled={isSaving}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar email
                      </Button>
                    </div>
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                    {isSaving && (
                      <p className="text-xs text-muted-foreground">Guardando...</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {isAddingNew && (
            <TableRow>
              <TableCell>
                <Input
                  value={newPlate}
                  onChange={(e) => {
                    // Normalizar en tiempo real: eliminar caracteres especiales y convertir a uppercase
                    const normalized = normalizePlate(e.target.value)
                    setNewPlate(normalized)
                    setErrorNew(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddNew()
                    }
                  }}
                  placeholder="AF999EF"
                  disabled={savingNew}
                  className="w-full font-medium"
                  autoFocus
                />
              </TableCell>
              <TableCell>
                <div className="space-y-2 min-w-[400px]">
                  <div className="flex flex-col gap-2">
                    {newResponsables.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => handleNewEmailChange(index, e.target.value)}
                          placeholder="email@ejemplo.com"
                          disabled={savingNew}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNewEmail(index)}
                          disabled={savingNew}
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label="Eliminar email"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewEmail}
                      disabled={savingNew}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar email
                    </Button>
                  </div>
                  {errorNew && (
                    <p className="text-xs text-destructive">{errorNew}</p>
                  )}
                  <Button
                    type="button"
                    onClick={handleAddNew}
                    disabled={savingNew || !normalizePlate(newPlate)}
                    className="w-full mt-2"
                  >
                    {savingNew ? "Guardando..." : "Guardar patente"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell colSpan={2} className="text-center">
              <Button
                variant="outline"
                onClick={() => setIsAddingNew(true)}
                disabled={isAddingNew || savingNew}
                className="w-full"
              >
                ➕ Agregar patente
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
