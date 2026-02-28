import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  onAction?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { icon: 36, titleClass: 'text-body-md', subtitleClass: 'text-body-sm', minH: 'min-h-[160px]' },
  md: { icon: 48, titleClass: 'text-heading-lg', subtitleClass: 'text-body-md', minH: 'min-h-[280px]' },
  lg: { icon: 64, titleClass: 'text-display-sm', subtitleClass: 'text-body-lg', minH: 'min-h-[400px]' },
};

export function EmptyState({ icon: Icon, title, titleAr, subtitle, subtitleAr, actionLabel, actionLabelAr, onAction, size = 'md' }: EmptyStateProps) {
  const { language } = useLanguage();
  const cfg = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center justify-center', cfg.minH)}>
      <Icon size={cfg.icon} className="text-slate-300" />
      <p className={cn(cfg.titleClass, 'text-muted-foreground font-medium mt-4')}>
        {language === 'ar' ? titleAr : title}
      </p>
      {(subtitle || subtitleAr) && (
        <p className={cn(cfg.subtitleClass, 'text-slate-400 mt-2 max-w-[360px] text-center')}>
          {language === 'ar' ? subtitleAr : subtitle}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant={size === 'lg' ? 'default' : 'outline'}
          className="mt-5"
          onClick={onAction}
        >
          {language === 'ar' ? actionLabelAr : actionLabel}
        </Button>
      )}
    </div>
  );
}
