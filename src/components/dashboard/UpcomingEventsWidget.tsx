import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar } from 'lucide-react';

export default function UpcomingEventsWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Empty state for now
  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.upcomingEvents')}</h2>
        <button
          onClick={() => navigate('/calendar')}
          className="text-body-sm text-accent hover:underline font-medium"
        >
          {t('dashboard.viewCalendar')}
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-12 min-h-[200px]">
        <Calendar className="h-12 w-12 text-slate-300 mb-3" strokeWidth={1.5} />
        <p className="text-body-md text-muted-foreground mb-3">{t('dashboard.noUpcomingEvents')}</p>
        <button
          onClick={() => navigate('/calendar')}
          className="text-body-sm text-accent font-medium border border-accent rounded-button px-4 h-8 hover:bg-accent/5 transition-colors"
        >
          {t('dashboard.addEvent')}
        </button>
      </div>
    </div>
  );
}
