import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(
          'min-h-[100px] rounded-input border-slate-300 text-body-md placeholder:text-slate-400 resize-y',
          'focus-visible:ring-accent focus-visible:border-accent',
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = 'FormTextarea';
