"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormInputProps extends React.ComponentProps<typeof Input> {
  label?: string
  error?: string
  id?: string
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, id: idProp, ...props }, ref) => {
    const id = React.useId()
    const inputId = idProp ?? id

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={inputId}
            className={cn(error && "text-destructive")}
          >
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 min-h-[44px] text-base",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormInput.displayName = "FormInput"

export { FormInput }
