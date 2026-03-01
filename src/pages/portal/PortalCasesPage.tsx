import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { Scale, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PortalCasesPage() {
  const { t, language } = useLanguage();
  const { activeClientId } = usePortalOrg();

  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;
    loadCases();
  }, [activeClientId]);

  const loadCases = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('cases')
      .select('id, case_number, title, title_ar, case_type, status, priority, court_name, court_name_ar, updated_at')
      .eq('client_id', activeClientId!)
      .eq('is_visible_to_client', true)
      .not('status', 'eq', 'archived')
      .order('updated_at', { ascending: false });

    const caseIds = (data || []).map((c: any) => c.id);
    let hearingsMap: Record<string, any> = {};
    if (caseIds.length > 0) {
      const { data: hearings } = await supabase
        .from('case_hearings')
        .select('case_id, hearing_date')
        .in('case_id', caseIds)
        .eq('is_visible_to_client', true)
        .gte('hearing_date', new Date().toISOString().split('T')[0])
        .order('hearing_date', { ascending: true });
      (hearings || []).forEach((h: any) => {
        if (!hearingsMap[h.case_id]) hearingsMap[h.case_id] = h.hearing_date;
      });
    }

    setCases((data || []).map((c: any) => ({ ...c, nextHearing: hearingsMap[c.id] || null })));
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
        <h1 className="text-display-lg font-bold text-foreground">{t('portal.cases.title')}</h1>
        <p className="text-body-md text-muted-foreground mt-1">{t('portal.cases.subtitle')}</p>
      </div>

      {cases.length === 0 ? (
        <EmptyState icon={Scale} title={t('portal.cases.noCases')} titleAr={t('portal.cases.noCases')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map(c => {
            const daysUntil = c.nextHearing ? differenceInDays(new Date(c.nextHearing), new Date()) : null;
            return (
              <Link
                key={c.id}
                to={`/portal/cases/${c.id}`}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow relative"
              >
                <div className="absolute top-4 end-4">
                  <StatusBadge status={c.status} type="case" />
                </div>
                <p className="text-body-sm text-muted-foreground font-mono">{c.case_number}</p>
                <h3 className="text-lg font-semibold text-foreground mt-1 pe-20">
                  {language === 'ar' && c.title_ar ? c.title_ar : c.title}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-body-sm bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
                    {t(`cases.types.${c.case_type}`)}
                  </span>
                </div>
                {(c.court_name || c.court_name_ar) && (
                  <p className="text-body-sm text-muted-foreground mt-2">
                    {language === 'ar' && c.court_name_ar ? c.court_name_ar : c.court_name}
                  </p>
                )}
                {c.nextHearing && (
                  <div className={`flex items-center gap-1 text-body-sm mt-2 ${daysUntil !== null && daysUntil <= 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    <Calendar className="h-3.5 w-3.5" />
                    {t('portal.cases.nextHearing')}: {formatDate(c.nextHearing)}
                  </div>
                )}
                <p className="text-body-sm text-muted-foreground/60 mt-2">
                  {t('portal.cases.lastUpdate')}: {formatDate(c.updated_at)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
