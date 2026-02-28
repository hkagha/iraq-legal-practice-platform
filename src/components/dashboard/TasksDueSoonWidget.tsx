import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckSquare } from 'lucide-react';

export default function TasksDueSoonWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.tasksDueSoon')}</h2>
        <button
          onClick={() => navigate('/tasks')}
          className="text-body-sm text-accent hover:underline font-medium"
        >
          {t('dashboard.viewAll')}
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-12 min-h-[200px]">
        <CheckSquare className="h-12 w-12 text-slate-300 mb-3" strokeWidth={1.5} />
        <p className="text-body-md text-muted-foreground mb-3">{t('dashboard.noTasksDue')}</p>
        <button
          onClick={() => navigate('/tasks')}
          className="text-body-sm text-accent font-medium border border-accent rounded-button px-4 h-8 hover:bg-accent/5 transition-colors"
        >
          {t('dashboard.createTask')}
        </button>
      </div>
    </div>
  );
}
