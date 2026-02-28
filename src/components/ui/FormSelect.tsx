import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: FormSelectOption[];
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormSelect({ value, onValueChange, placeholder, options, error, disabled, className }: FormSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-11 rounded-input border-slate-300 text-body-md',
          'focus:ring-accent focus:border-accent',
          error && 'border-destructive focus:ring-destructive',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-card shadow-md max-h-[280px]">
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="h-10 px-3 cursor-pointer">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
