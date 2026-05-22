import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-tierra-muted font-body">{label}</label>}
      <input
        ref={ref}
        className={clsx('input-field', error && 'border-rubi/50 focus:border-rubi', className)}
        {...props}
      />
      {error && <span className="text-xs text-rubi-light">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-tierra-muted font-body">{label}</label>}
      <textarea
        ref={ref}
        className={clsx(
          'input-field resize-none',
          error && 'border-rubi/50 focus:border-rubi',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-rubi-light">{error}</span>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
