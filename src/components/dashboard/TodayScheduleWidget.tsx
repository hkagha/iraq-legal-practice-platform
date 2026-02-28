import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sun } from 'lucide-react';

interface TodayEvent {
  id: string;
  time: string | null;
  title: string;
  type: 'hearing' | 'task' | 'errand' | 'event';
  color: string;
  link: string;
}

export default function TodayScheduleWidget() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<TodayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const fetchToday = async () => {
      const today = new Date().toISOString().split('T')[0];

      const [hearingsRes, tasksRes, errandsRes, calRes] = await Promise.all([
        supabase.from('case_hearings').select('id, hearing_date, hearing_time, hearing_type, case_id')
          .eq('organization_id', profile.organization_id!).eq('hearing_date', today).eq('status', 'scheduled'),
        supabase.from('tasks').select('id, title, title_ar, due_date, due_time')
          .eq('organization_id', profile.organization_id!).eq('due_date', today)
          .not('status', 'in', '("completed","cancelled")'),
        supabase.from('errands').select('id, title, title_ar, due_date')
          .eq('organization_id', profile.organization_id!).eq('due_date', today)
          .not('status', 'in', '("completed","cancelled","approved","rejected")'),
        supabase.from('calendar_events').select('id, title, title_ar, start_date, start_time, color')
          .eq('organization_id', profile.organization_id!).eq('start_date', today),
      ]);

      const items: TodayEvent[] = [];

      (hearingsRes.data || []).forEach(h => {
        items.push({ id: h.id, time: h.hearing_time, title: h.hearing_type, type: 'hearing', color: '#EF4444', link: `/cases/${h.case_id}` });
      });
      (tasksRes.data || []).forEach(tk => {
        items.push({ id: tk.id, time: (tk as any).due_time || null, title: language === 'ar' && tk.title_ar ? tk.title_ar : tk.title, type: 'task', color: '#3B82F6', link: '/tasks' });
      });
      (errandsRes.data || []).forEach(e => {
        items.push({ id: e.id, time: null, title: language === 'ar' && e.title_ar ? e.title_ar : e.title, type: 'errand', color: '#8B5CF6', link: `/errands/${e.id}` });
      });
      (calRes.data || []).forEach(ev => {
        items.push({ id: ev.id, time: ev.start_time, title: language === 'ar' && ev.title_ar ? ev.title_ar : ev.title, type: 'event', color: ev.color || '#C9A84C', link: '/calendar' });
      });

      items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
      setEvents(items);
      setLoading(false);
    };
    fetchToday();
  }, [profile?.organization_id, language]);

  const todayStr = language === 'en'
    ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-IQ', { month: 'long', day: 'numeric' });

  const formatTime = (time: string | null) => {
    if (!time) return language === 'ar' ? 'طوال اليوم' : 'All day';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? (language === 'ar' ? 'م' : 'PM') : (language === 'ar' ? 'ص' : 'AM');
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card shadow-sm animate-pulse">
        <div className="px-5 py-4 border-b border-border"><div className="h-5 w-32 bg-muted rounded" /></div>
        <div className="p-5 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}</div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-heading-lg text-foreground">
          {language === 'ar' ? 'اليوم' : 'Today'} <span className="text-body-md text-muted-foreground font-normal ms-2">{todayStr}</span>
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Sun className="h-10 w-10 text-muted-foreground/30 mb-2" strokeWidth={1.5} />
          <p className="text-body-md text-muted-foreground">
            {language === 'ar' ? 'لا يوجد جدول لهذا اليوم' : 'Nothing scheduled for today'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map(ev => (
            <button key={ev.id} onClick={() => navigate(ev.link)}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors w-full text-start">
              <span className="text-body-sm font-medium text-muted-foreground w-16 shrink-0">{formatTime(ev.time)}</span>
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
              <span className="text-body-md text-foreground truncate">{ev.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
