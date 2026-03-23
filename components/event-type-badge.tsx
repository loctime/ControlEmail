"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { eventTypeLabels, eventTypeDescriptions } from "@/lib/data"
import { getTypeBadgeVariant } from "@/lib/status-tokens"

interface EventTypeBadgeProps {
  tipo: string
  className?: string
}

export function EventTypeBadge({ tipo, className }: EventTypeBadgeProps) {
  const label = eventTypeLabels[tipo as keyof typeof eventTypeLabels] ?? tipo
  const description = eventTypeDescriptions[tipo]

  const badge = (
    <Badge variant={getTypeBadgeVariant(tipo)} className={className}>
      {label}
    </Badge>
  )

  if (!description) return badge

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
