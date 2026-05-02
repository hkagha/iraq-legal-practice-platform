import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Briefcase, FileText, CheckSquare, Receipt, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';

type DayItem = {
  id: string;
  type: 'hearing' | 'errand' | 'task' | 'invoice' | 'event';
  title: string;
  title_ar: string | null;
  date: string;
  time?: string | null;
  link: string;
};

const TYPE_META = {
  hearing: { icon: Briefcase,     color: 'bg-info-light text-info border-info/20' },
  errand:  { icon: FileText,      color: 'bg-warning-light text-warning border-warning/20' },
  task:    { icon: CheckSquare,   color: 'bg-accent/10 text-accent-dark border-accent/20' },
  invoice: { icon: Receipt,       color: 'bg-error-light text-error border-error/20' },
  event:   { icon: CalendarClock, color: 'bg-success-light text-success border-success/20' },
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function fmtISO(d: Date) { return d.toISOString().slice(0, 10); }

export default function CalendarPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const orgId = profile?.organization_id;
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const startDay = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', orgId, fmtISO(monthStart), fmtISO(monthEnd)],
    enabled: !!orgId,
    queryFn: async (): Promise<DayItem[]> => {
      const from = fmtISO(monthStart);
      const to = fmtISO(monthEnd);
      const [hearings, errands, tasks, invoices, events] = await Promise.all([
        supabase.from('case_hearings').select('id, hearing_date, hearing_time, case_id, hearing_type, status').eq('organization_id', orgId!).gte('hearing_date', from).lte('hearing_date', to),
        supabase.from('errands').select('id, title, title_ar, due_date').eq('organization_id', orgId!).gte('due_date', from).lte('due_date', to),
        supabase.from('tasks').select('id, title, title_ar, due_date, status').eq('organization_id', orgId!).gte('due_date', from).lte('due_date', to).neq('status', 'completed'),
        supabase.from('invoices').select('id, invoice_number, due_date, status').eq('organization_id', orgId!).gte('due_date', from).lte('due_date', to).not('status', 'in', '(paid,cancelled,written_off,draft)'),
        supabase.from('calendar_events').select('id, title, title_ar, start_date, start_time, case_id, errand_id').eq('organization_id', orgId!).gte('start_date', from).lte('start_date', to),
      ]);

      const hearingCaseIds = [...new Set((hearings.data ?? []).map(h => h.case_id))];
      const caseMap = new Map<string, any>();
      if (hearingCaseIds.length) {
        const { data: cs } = await supabase.from('cases').select('id, title, title_ar, case_number').in('id', hearingCaseIds);
        (cs ?? []).forEach((c: any) => caseMap.set(c.id, c));
      }

      return [
        ...(hearings.data ?? []).map((h: any) => {
          const c = caseMap.get(h.case_id);
          return {
            id: h.id, type: 'hearing' as const,
            title: c ? `${c.case_number} · ${h.hearing_type}` : h.hearing_type,
            title_ar: c ? `${c.case_number} · ${h.hearing_type}` : h.hearing_type,
            date: h.hearing_date, time: h.hearing_time,
            link: `/cases/${h.case_id}`,
          };
        }),
        ...(errands.data ?? []).map((e: any) => ({ id: e.id, type: 'errand' as const, title: e.title, title_ar: e.title_ar, date: e.due_date, link: `/errands/${e.id}` })),
        ...(tasks.data ?? []).map((t: any) => ({ id: t.id, type: 'task' as const, title: t.title, title_ar: t.title_ar, date: t.due_date, link: `/tasks` })),
        ...(invoices.data ?? []).map((i: any) => ({ id: i.id, type: 'invoice' as const, title: i.invoice_number, title_ar: i.invoice_number, date: i.due_date, link: `/billing/${i.id}` })),
        ...(events.data ?? []).map((e: any) => ({
          id: e.id,
          type: 'event' as const,
          title: e.title,
          title_ar: e.title_ar,
          date: e.start_date,
          time: e.start_time,
          link: e.case_id ? `/cases/${e.case_id}` : e.errand_id ? `/errands/${e.errand_id}` : '/calendar',
        })),
      ];
    },
  });

  const itemsByDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    (data ?? []).forEach(item => {
      if (!item.date) return;
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    });
    return map;
  }, [data]);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleString(isEN ? 'en-US' : 'ar-IQ', { month: 'long', year: 'numeric' });
  const weekdays = isEN
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" titleAr="التقويم" subtitle="Hearings, errands, tasks, invoices and events in one view" subtitleAr="الجلسات والمعاملات والمهام والفواتير والأحداث في عرض واحد" />

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-heading-md font-semibold text-primary capitalize">{monthLabel}</h2>
            <Button variant="ghost" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
              {isEN ? 'Today' : 'اليوم'}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
            {weekdays.map(d => (
              <div key={d} className="bg-muted text-center text-body-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="bg-card min-h-[90px]" />;
              const iso = fmtISO(cell);
              const items = itemsByDay.get(iso) ?? [];
              const isToday = iso === fmtISO(new Date());
              return (
                <div key={i} className={cn('bg-card min-h-[90px] p-1.5 flex flex-col gap-1', isToday && 'ring-2 ring-accent ring-inset')}>
                  <div className={cn('text-body-xs font-medium', isToday ? 'text-accent' : 'text-muted-foreground')}>
                    {cell.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {items.slice(0, 3).map(it => {
                      const meta = TYPE_META[it.type];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={`${it.type}-${it.id}`}
                          onClick={() => navigate(it.link)}
                          className={cn('text-start text-body-xs px-1.5 py-0.5 rounded border truncate flex items-center gap-1', meta.color)}
                        >
                          <Icon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{isEN ? it.title : (it.title_ar || it.title)}</span>
                        </button>
                      );
                    })}
                    {items.length > 3 && (
                      <span className="text-body-xs text-muted-foreground px-1.5">+{items.length - 3} {isEN ? 'more' : 'أخرى'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map(k => {
            const Icon = TYPE_META[k].icon;
            const labels: Record<string, [string, string]> = {
              hearing: ['Hearings', 'الجلسات'],
              errand: ['Errands', 'المعاملات'],
              task: ['Tasks', 'المهام'],
              invoice: ['Invoices due', 'استحقاق الفواتير'],
              event: ['Events', 'الأحداث'],
            };
            return (
              <div key={k} className="flex items-center gap-1.5 text-body-xs">
                <span className={cn('p-1 rounded border', TYPE_META[k].color)}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="text-muted-foreground">{isEN ? labels[k][0] : labels[k][1]}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
