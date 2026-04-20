import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  labelAr: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  isLoading?: boolean;
  /** Show the gold rule under the value (default: only on the first card in a group) */
  accent?: boolean;
}

export function StatCard({ icon: Icon, label, labelAr, value, trend, onClick, isLoading, accent }: StatCardProps) {
  const { language } = useLanguage();
  const displayLabel = language === 'ar' ? labelAr : label;

  if (isLoading) {
    return (
      <div className="bg-card border border-border p-6">
        <Skeleton className="h-3 w-24 mb-5" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border p-6 transition-colors duration-200',
        onClick && 'cursor-pointer hover:bg-secondary/40',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="eyebrow text-muted-foreground">{displayLabel}</p>
        {Icon && <Icon size={14} className="text-muted-foreground/60" strokeWidth={1.75} />}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display text-[28px] leading-none text-foreground tabular font-medium">{value}</div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {trend.isPositive ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className={cn('mt-4 h-px w-8', accent ? 'bg-accent' : 'bg-border')} />
    </div>
  );
}
