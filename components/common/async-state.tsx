import { Button } from "@/components/ui/button"

interface AsyncStateProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
}

export function AsyncState({
  loading,
  error,
  empty,
  emptyMessage = "No hay datos para mostrar",
  onRetry,
}: AsyncStateProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  if (empty) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return null
}
