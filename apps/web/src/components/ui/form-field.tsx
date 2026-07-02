import * as React from 'react'
import { Input } from './input'
import { Label } from './label'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
  hint?: string
}

// Label + input + inline error, with aria-invalid/aria-describedby wired so
// screen readers announce the error and link it to the field.
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, name, error, hint, id, ...props }, ref) => {
    const fieldId = id ?? name
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        <Input
          ref={ref}
          id={fieldId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = 'FormField'
