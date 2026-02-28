import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface EventItem {
  id: string;
  date: string;
  title: string;
  type: 'hearing' | 'errand' | 'event';
  entityId: string;
  entityNumber?: string;
}

export default function UpcomingEventsWidget() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetchEvents = async () => {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      const [hearingsRes, errandsRes, calEventsRes] = await Promise.all([
        supabase
          .from('case_hearings')
          .select('id, hearing_date, hearing_time, hearing_type, case_id')
          .eq('organization_id', profile.organization_id!)
          .gte('hearing_date', today)
          .eq('status', 'scheduled')
          .order('hearing_date', { ascending: true })
          .order('hearing_time', { ascending: true })
          .limit(5),
        supabase
          .from('errands')
          .select('id, title, title_ar, due_date, errand_number, status')
          .eq('organization_id', profile.organization_id!)
          .gte('due_date', today)
          .lte('due_date', twoWeeks)
          .not('status', 'in', '("completed","cancelled","approved","rejected")')
          .order('due_date', { ascending: true })
          .limit(5),
        supabase
          .from('calendar_events')
          .select('id, title, title_ar, start_date, start_time, event_type, color, is_virtual')
          .eq('organization_id', profile.organization_id!)
          .gte('start_date', today)
          .lte('start_date', twoWeeks)
          .order('start_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5),
      ]);

      const hearingItems: EventItem[] = [];
      if (hearingsRes.data && hearingsRes.data.length > 0) {
        const caseIds = [...new Set(hearingsRes.data.map(d => d.case_id))];
        const { data: cases } = await supabase
          .from('cases')
          .select('id, title, title_ar, case_number')
          .in('id', caseIds);
        const caseMap = new Map((cases || []).map(c => [c.id, c]));

        hearingsRes.data.forEach(h => {
          const c = caseMap.get(h.case_id);
          hearingItems.push({
            id: h.id,
            date: h.hearing_date,
            title: language === 'ar' ? (c?.title_ar || c?.title || '—') : (c?.title || '—'),
            type: 'hearing',
            entityId: h.case_id,
            entityNumber: c?.case_number,
          });
        });
      }

      const errandItems: EventItem[] = (errandsRes.data || []).map(e => ({
        id: e.id,
        date: e.due_date!,
        title: language === 'ar' && e.title_ar ? e.title_ar : e.title,
        type: 'errand',
        entityId: e.id,
        entityNumber: e.errand_number,
      }));

      const calEventItems: EventItem[] = (calEventsRes.data || []).map(ev => ({
        id: ev.id,
        date: ev.start_date,
        title: language === 'ar' && ev.title_ar ? ev.title_ar : ev.title,
        type: 'event' as const,
        entityId: ev.id,
      }));

      const merged = [...hearingItems, ...errandItems, ...calEventItems]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 7);

      setEvents(merged);
      setLoading(false);
    };
    fetchEvents();
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
            const d = new Date(ev.date + 'T00:00:00');
            const month = monthNames[d.getMonth()];
            const day = d.getDate();
            const isHearing = ev.type === 'hearing';
            const isEvent = ev.type === 'event';
            const link = isHearing ? `/cases/${ev.entityId}` : isEvent ? '/calendar' : `/errands/${ev.entityId}`;

            const badgeClass = isHearing
              ? 'bg-[#FEF2F2] text-[#EF4444]'
              : isEvent
              ? 'bg-[#FFFBEB] text-[#C9A84C]'
              : 'bg-[#F5F3FF] text-[#8B5CF6]';
            const badgeText = isHearing
              ? t('dashboard.hearing')
              : isEvent
              ? t('dashboard.meeting')
              : t('dashboard.errandDue');

            return (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(link)}>
                <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase leading-none">{month}</span>
                  <span className="text-heading-sm font-bold text-foreground leading-tight">{day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-foreground truncate">{ev.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center text-[11px] font-medium rounded-badge px-1.5 py-0.5 ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>
                <span className="text-body-sm text-muted-foreground font-mono flex-shrink-0">{ev.entityNumber}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
