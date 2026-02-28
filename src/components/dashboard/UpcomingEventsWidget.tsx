import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

interface HearingEvent {
  id: string;
  hearing_date: string;
  hearing_time: string | null;
  hearing_type: string;
  case_id: string;
  case_title?: string;
  case_number?: string;
}

export default function UpcomingEventsWidget() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<HearingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('case_hearings')
        .select('id, hearing_date, hearing_time, hearing_type, case_id')
        .eq('organization_id', profile.organization_id!)
        .gte('hearing_date', today)
        .eq('status', 'scheduled')
        .order('hearing_date', { ascending: true })
        .order('hearing_time', { ascending: true })
        .limit(5);

      if (data && data.length > 0) {
        // Fetch case titles
        const caseIds = [...new Set(data.map(d => d.case_id))];
        const { data: cases } = await supabase
          .from('cases')
          .select('id, title, title_ar, case_number')
          .in('id', caseIds);
        const caseMap = new Map((cases || []).map(c => [c.id, c]));

        setEvents(data.map(h => ({
          ...h,
          case_title: language === 'ar' ? (caseMap.get(h.case_id)?.title_ar || caseMap.get(h.case_id)?.title) : caseMap.get(h.case_id)?.title,
          case_number: caseMap.get(h.case_id)?.case_number,
        })));
      }
      setLoading(false);
    };
    fetch();
  }, [profile?.organization_id, language]);

  const monthNames = language === 'ar'
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card shadow-sm animate-pulse">
        <div className="px-5 py-4 border-b border-slate-100"><div className="h-5 w-40 bg-muted rounded" /></div>
        <div className="p-5 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-heading-lg text-foreground">{t('dashboard.upcomingEvents')}</h2>
        <button
          onClick={() => navigate('/calendar')}
          className="text-body-sm text-accent hover:underline font-medium"
        >
          {t('dashboard.viewCalendar')}
        </button>
      </div>

      {events.length === 0 ? (
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
      ) : (
        <div className="divide-y divide-border">
          {events.map(ev => {
            const d = new Date(ev.hearing_date + 'T00:00:00');
            const month = monthNames[d.getMonth()];
            const day = d.getDate();
            const timeStr = ev.hearing_time ? ev.hearing_time.slice(0, 5) : '';

            return (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${ev.case_id}`)}>
                <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase leading-none">{month}</span>
                  <span className="text-heading-sm font-bold text-foreground leading-tight">{day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-foreground truncate">{ev.case_title || '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center text-[11px] font-medium rounded-badge px-1.5 py-0.5 bg-[#FEF2F2] text-[#EF4444]">
                      {t('dashboard.hearing')}
                    </span>
                    {timeStr && <span className="text-body-sm text-muted-foreground">{timeStr}</span>}
                  </div>
                </div>
                <span className="text-body-sm text-muted-foreground font-mono flex-shrink-0">{ev.case_number}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
