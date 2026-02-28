import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, helperText, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-label text-foreground">
        {label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-body-sm text-destructive flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-body-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
