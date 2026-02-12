"use client"

import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1600px]",
  full: "max-w-full",
}

export function PageContainer({
  children,
  className,
  maxWidth = "full",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 p-6 lg:p-8",
        maxWidth !== "full" && "mx-auto w-full",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  )
}
