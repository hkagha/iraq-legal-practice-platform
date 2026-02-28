import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  label: string;
  labelAr: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  isLoading?: boolean;
}

export function StatCard({ icon: Icon, iconColor, iconBgColor, label, labelAr, value, trend, onClick, isLoading }: StatCardProps) {
  const { language } = useLanguage();
  const displayLabel = language === 'ar' ? labelAr : label;

  if (isLoading) {
    return (
      <div className="bg-card rounded-card border border-border p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-12 rounded-badge" />
        </div>
        <Skeleton className="h-7 w-16 mt-3" />
        <Skeleton className="h-4 w-24 mt-1" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-card border border-border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBgColor }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-body-sm font-medium rounded-badge px-2 py-0.5',
              trend.isPositive ? 'bg-success-light text-success' : 'bg-error-light text-error'
            )}
          >
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="text-display-sm text-foreground mt-3">{value}</div>
      <div className="text-body-sm text-muted-foreground mt-1">{displayLabel}</div>
    </div>
  );
}
