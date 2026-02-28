import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export function InlineLoader({ text, className }: InlineLoaderProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Loader2 size={16} className="animate-spin" />
      {text && <span className="text-body-sm">{text}</span>}
    </span>
  );
}
