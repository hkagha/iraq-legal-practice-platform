import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** English tooltip label */
  tooltip: string;
  /** Arabic tooltip label */
  tooltipAr?: string;
  variant?: 'default' | 'ghost' | 'subtle' | 'destructive';
  size?: 'sm' | 'md';
}

const variantClasses = {
  default: 'bg-secondary text-foreground hover:bg-secondary/80',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  subtle: 'text-foreground/70 hover:text-foreground hover:bg-muted',
  destructive: 'text-destructive hover:bg-destructive/10',
};

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
};

/**
 * Wrapper for icon-only buttons. Always shows a tooltip on hover.
 * Use this for any button whose meaning is conveyed by an icon alone.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tooltip, tooltipAr, variant = 'ghost', size = 'md', className, children, ...rest }, ref) => {
    const { language } = useLanguage();
    const label = language === 'ar' && tooltipAr ? tooltipAr : tooltip;

    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type="button"
            aria-label={label}
            className={cn(
              'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none',
              sizeClasses[size],
              variantClasses[variant],
              className,
            )}
            {...rest}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  },
);
IconButton.displayName = 'IconButton';
