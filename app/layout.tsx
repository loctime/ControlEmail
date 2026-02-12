import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FleetGuard - Control Vehicular",
  description:
    "Sistema de gestion y seguimiento de eventos vehiculares. Monitoreo de excesos de velocidad, vehiculos no identificados y desvios operativos.",
}

export const viewport: Viewport = {
  themeColor: "#1a1f2e",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
