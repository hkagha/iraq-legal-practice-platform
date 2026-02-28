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
}

export function PageHeader({ title, titleAr, subtitle, subtitleAr, actionLabel, actionLabelAr, onAction, secondaryActions, breadcrumbs }: PageHeaderProps) {
  const { language, isRTL } = useLanguage();
  const sep = isRTL ? ' \\ ' : ' / ';

  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-body-sm text-muted-foreground mb-3">
          {breadcrumbs.map((item, i) => {
            const label = language === 'ar' ? item.labelAr : item.label;
            const isLast = i === breadcrumbs.length - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && <span>{sep}</span>}
                {isLast || !item.href ? (
                  <span className={cn(isLast && 'text-foreground')}>{label}</span>
                ) : (
                  <Link to={item.href} className="text-accent hover:underline">{label}</Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-foreground">{language === 'ar' ? titleAr : title}</h1>
          {(subtitle || subtitleAr) && (
            <p className="text-body-md text-muted-foreground mt-1">
              {language === 'ar' ? subtitleAr : subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {secondaryActions?.map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <Button key={i} variant="outline" onClick={action.onClick} className="h-10">
                {ActionIcon && <ActionIcon size={16} />}
                {language === 'ar' ? action.labelAr : action.label}
              </Button>
            );
          })}
          {actionLabel && onAction && (
            <Button onClick={onAction} className="h-10 bg-accent text-accent-foreground hover:bg-accent-dark">
              <Plus size={16} />
              {language === 'ar' ? actionLabelAr : actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
