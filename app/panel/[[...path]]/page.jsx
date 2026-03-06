"use client"

import dynamic from "next/dynamic"

const App = dynamic(() => import("../../../src/App"), { ssr: false })

export default function PanelPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
        LEGACY: este panel se mantiene solo por compatibilidad y no forma parte de la nueva arquitectura principal.
      </div>
      <App />
    </div>
  )
}
