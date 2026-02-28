import { useLanguage } from '@/contexts/LanguageContext';
import { Activity } from 'lucide-react';

export default function RecentActivityWidget() {
  const { t } = useLanguage();

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.recentActivity')}</h2>
        <button className="text-body-sm text-accent hover:underline font-medium">
          {t('dashboard.viewAll')}
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-12 min-h-[180px]">
        <Activity className="h-12 w-12 text-slate-300 mb-3" strokeWidth={1.5} />
        <p className="text-body-md text-muted-foreground">{t('dashboard.noRecentActivity')}</p>
        <p className="text-body-sm text-slate-400 mt-1">{t('dashboard.activityWillAppear')}</p>
      </div>
    </div>
  );
}
