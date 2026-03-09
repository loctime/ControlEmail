"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"

const STALE_TIME_MS = 5 * 60 * 1000 // 5 minutes
const GC_TIME_MS = 24 * 60 * 60 * 1000 // 24 hours

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

function getPersister() {
  return createSyncStoragePersister({
    storage: window.localStorage,
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient())
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const persister = useMemo(
    () => (isClient ? getPersister() : null),
    [isClient]
  )

  if (!isClient || !persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: GC_TIME_MS,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
