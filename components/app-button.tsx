"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * AppButton: wrapper de Button con tamaños táctiles (min 44x44px) para accesibilidad.
 */
const AppButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeClasses =
      size === "icon"
        ? "h-11 w-11 min-h-[44px] min-w-[44px]"
        : size === "sm"
          ? "h-9 min-h-[36px] px-4"
          : size === "lg"
            ? "h-12 min-h-[44px] px-8"
            : "h-11 min-h-[44px] px-6"

    return (
      <Button
        ref={ref}
        size={size}
        className={cn(sizeClasses, className)}
        {...props}
      />
    )
  }
)
AppButton.displayName = "AppButton"

export { AppButton }
