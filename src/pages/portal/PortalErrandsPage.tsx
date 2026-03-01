import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { FileCheck, Calendar } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/progress';

export default function PortalErrandsPage() {
  const { t, language } = useLanguage();
  const { activeClientId } = usePortalOrg();

  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;
    loadErrands();
  }, [activeClientId]);

  const loadErrands = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('errands')
      .select('id, errand_number, title, title_ar, category, status, priority, due_date, total_steps, completed_steps, updated_at')
      .eq('client_id', activeClientId!)
      .eq('is_visible_to_client', true)
      .not('status', 'eq', 'cancelled')
      .order('updated_at', { ascending: false });

    setErrands(data || []);
    setLoading(false);
  };

  const formatDate = (d: string) => {
    try {
      return language === 'ar' ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale }) : format(new Date(d), 'MMM dd, yyyy');
    } catch { return d; }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg font-bold text-foreground">{t('portal.errands.title')}</h1>
        <p className="text-body-md text-muted-foreground mt-1">{t('portal.errands.subtitle')}</p>
      </div>

      {errands.length === 0 ? (
        <EmptyState icon={FileCheck} title={t('portal.errands.noErrands')} titleAr={t('portal.errands.noErrands')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {errands.map(e => {
            const progress = e.total_steps > 0 ? Math.round((e.completed_steps / e.total_steps) * 100) : 0;
            const isOverdue = e.due_date && isPast(new Date(e.due_date)) && !['completed', 'approved'].includes(e.status);
            return (
              <Link
                key={e.id}
                to={`/portal/errands/${e.id}`}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-body-sm text-muted-foreground font-mono">{e.errand_number}</p>
                  <StatusBadge status={e.status} type="errand" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {language === 'ar' && e.title_ar ? e.title_ar : e.title}
                </h3>
                <span className="text-body-sm bg-secondary text-muted-foreground px-2 py-0.5 rounded-md mt-2 inline-block">
                  {t(`errands.categories.${e.category}`)}
                </span>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body-sm text-muted-foreground">{t('portal.errands.progress')}</span>
                    <span className="text-body-sm font-medium">{e.completed_steps}/{e.total_steps} {t('portal.errands.steps')}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {e.due_date && (
                  <div className={`flex items-center gap-1 text-body-sm mt-3 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Calendar className="h-3.5 w-3.5" />
                    {t('portal.errands.dueDate')}: {formatDate(e.due_date)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
