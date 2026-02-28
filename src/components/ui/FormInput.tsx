import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  startIcon?: LucideIcon;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, error, startIcon: StartIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {StartIcon && (
          <StartIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          className={cn(
            'h-11 rounded-input border-slate-300 text-body-md placeholder:text-slate-400',
            'focus-visible:ring-accent focus-visible:border-accent',
            StartIcon && 'ps-10',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          {...props}
        />
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';
