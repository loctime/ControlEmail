"use client"

import { type ReactNode, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface DataTableColumn<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  className?: string
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  pageSize?: number
  getRowKey: (row: T) => string
}

export function DataTable<T>({ columns, rows, pageSize = 10, getRowKey }: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const data = [...rows]
    data.sort((a, b) => {
      const aValue = String((a as Record<string, unknown>)[sortKey] ?? "")
      const bValue = String((b as Record<string, unknown>)[sortKey] ?? "")
      if (aValue === bValue) return 0
      const base = aValue > bValue ? 1 : -1
      return sortDir === "asc" ? base : -base
    })
    return data
  }, [rows, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pagedRows = sortedRows.slice(start, start + pageSize)

  const onHeaderClick = (column: DataTableColumn<T>) => {
    if (!column.sortable) return
    const key = String(column.key)
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir("asc")
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={column.className}>
                  <button
                    type="button"
                    className={column.sortable ? "hover:underline" : "cursor-default"}
                    onClick={() => onHeaderClick(column)}
                  >
                    {column.header}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((row) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={column.className}>
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[String(column.key)] ?? "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Pagina {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}

