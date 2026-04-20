import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  labelAr: string;
  href?: string;
}

interface SecondaryAction {
  label: string;
  labelAr: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface PageHeaderProps {
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  onAction?: () => void;
  secondaryActions?: SecondaryAction[];
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  eyebrowAr?: string;
}

export function PageHeader({ title, titleAr, subtitle, subtitleAr, actionLabel, actionLabelAr, onAction, secondaryActions, breadcrumbs, eyebrow, eyebrowAr }: PageHeaderProps) {
  const { language, isRTL } = useLanguage();
  const sep = isRTL ? '\u00a0\\\u00a0' : '\u00a0/\u00a0';

  return (
    <div className="mb-8 pb-6 border-b border-border">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[11px] tracking-wider text-muted-foreground mb-4 small-caps">
          {breadcrumbs.map((item, i) => {
            const label = language === 'ar' ? item.labelAr : item.label;
            const isLast = i === breadcrumbs.length - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-muted-foreground/50">{sep}</span>}
                {isLast || !item.href ? (
                  <span className={cn(isLast && 'text-foreground')}>{label}</span>
                ) : (
                  <Link to={item.href} className="hover:text-accent-dark transition-colors">{label}</Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          {(eyebrow || eyebrowAr) && (
            <p className="eyebrow mb-2">{language === 'ar' ? eyebrowAr : eyebrow}</p>
          )}
          <h1 className="text-display-lg text-foreground">{language === 'ar' ? titleAr : title}</h1>
          {(subtitle || subtitleAr) && (
            <p className="text-body-md text-muted-foreground mt-2 max-w-2xl">
              {language === 'ar' ? subtitleAr : subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryActions?.map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <Button key={i} variant="outline" onClick={action.onClick} className="h-10">
                {ActionIcon && <ActionIcon size={15} strokeWidth={1.75} />}
                {language === 'ar' ? action.labelAr : action.label}
              </Button>
            );
          })}
          {actionLabel && onAction && (
            <Button onClick={onAction} className="h-10">
              <Plus size={15} strokeWidth={2} />
              {language === 'ar' ? actionLabelAr : actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
