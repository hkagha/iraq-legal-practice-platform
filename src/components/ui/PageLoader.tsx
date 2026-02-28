import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

export function PageLoader() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <span className="text-heading-lg text-primary animate-pulse">{t('app.name')}</span>
      <Loader2 size={24} className="text-accent animate-spin" />
      <span className="text-body-sm text-muted-foreground">{t('common.loading')}</span>
    </div>
  );
}
