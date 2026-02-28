import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChevronLeft, ChevronRight, Plus, MapPin, Video, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday as isTodayFn, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import EventFormModal from '@/components/calendar/EventFormModal';
import TaskDetailSlideOver from '@/components/tasks/TaskDetailSlideOver';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarEvent {
  id: string;
  type: 'hearing' | 'task' | 'errand' | 'event' | 'invoice';
  title: string;
  date: string;
  time?: string | null;
  color: string;
  entityId?: string;
  caseId?: string;
  meta?: any;
}

const TYPE_COLORS: Record<string, string> = {
  hearing: '#EF4444',
  task: '#3B82F6',
  errand: '#8B5CF6',
  event: '#C9A84C',
  invoice: '#F59E0B',
};

const VIEWS: ViewMode[] = ['month', 'week', 'day', 'agenda'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_AR = ['أحد', 'اثن', 'ثلا', 'أربع', 'خمي', 'جمع', 'سبت'];

export default function CalendarPage() {
  const { t, language, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showHearings, setShowHearings] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showErrands, setShowErrands] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showInvoices, setShowInvoices] = useState(true);

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editCalEvent, setEditCalEvent] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (view === 'month') {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      return { start: format(subDays(startOfWeek(ms), 1), 'yyyy-MM-dd'), end: format(addDays(endOfWeek(me), 1), 'yyyy-MM-dd') };
    }
    if (view === 'week') {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      return { start: format(ws, 'yyyy-MM-dd'), end: format(we, 'yyyy-MM-dd') };
    }
    if (view === 'day') {
      const d = format(currentDate, 'yyyy-MM-dd');
      return { start: d, end: d };
    }
    // agenda: 14 days
    return { start: format(currentDate, 'yyyy-MM-dd'), end: format(addDays(currentDate, 14), 'yyyy-MM-dd') };
  }, [view, currentDate]);

  const fetchEvents = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const { start, end } = dateRange;
    const allEvents: CalendarEvent[] = [];

    // 1. Hearings
    const { data: hearings } = await supabase
      .from('case_hearings')
      .select('id, hearing_date, hearing_time, hearing_type, status, court_room, case_id, cases(case_number, title)')
      .eq('organization_id', orgId)
      .gte('hearing_date', start)
      .lte('hearing_date', end)
      .neq('status', 'cancelled');
    hearings?.forEach((h: any) => {
      allEvents.push({
        id: `hearing-${h.id}`,
        type: 'hearing',
        title: `${t(`cases.hearingTypes.${h.hearing_type}`) || h.hearing_type}: ${h.cases?.title || ''}`,
        date: h.hearing_date,
        time: h.hearing_time,
        color: TYPE_COLORS.hearing,
        caseId: h.case_id,
        entityId: h.id,
      });
    });

    // 2. Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, title_ar, due_date, due_time, priority, status, assigned_to, case_id, errand_id')
      .eq('organization_id', orgId)
      .gte('due_date', start)
      .lte('due_date', end)
      .not('status', 'in', '("completed","cancelled")');
    tasks?.forEach((tk: any) => {
      allEvents.push({
        id: `task-${tk.id}`,
        type: 'task',
        title: language === 'ar' && tk.title_ar ? tk.title_ar : tk.title,
        date: tk.due_date,
        time: tk.due_time,
        color: TYPE_COLORS.task,
        entityId: tk.id,
      });
    });

    // 3. Errands
    const { data: errands } = await supabase
      .from('errands')
      .select('id, title, title_ar, due_date, errand_number, status, priority')
      .eq('organization_id', orgId)
      .not('due_date', 'is', null)
      .gte('due_date', start)
      .lte('due_date', end)
      .not('status', 'in', '("completed","cancelled")');
    errands?.forEach((er: any) => {
      allEvents.push({
        id: `errand-${er.id}`,
        type: 'errand',
        title: `${t('calendar.due')}: ${language === 'ar' && er.title_ar ? er.title_ar : er.title}`,
        date: er.due_date,
        color: TYPE_COLORS.errand,
        entityId: er.id,
      });
    });

    // 4. Calendar events
    const { data: calEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('organization_id', orgId)
      .gte('start_date', start)
      .lte('start_date', end);
    calEvents?.forEach((ce: any) => {
      allEvents.push({
        id: `event-${ce.id}`,
        type: 'event',
        title: language === 'ar' && ce.title_ar ? ce.title_ar : ce.title,
        date: ce.start_date,
        time: ce.start_time,
        color: ce.color || TYPE_COLORS.event,
        entityId: ce.id,
        meta: ce,
      });
    });

    // 5. Invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, client_id, total_amount, status')
      .eq('organization_id', orgId)
      .gte('due_date', start)
      .lte('due_date', end)
      .in('status', ['sent', 'viewed', 'partially_paid']);
    invoices?.forEach((inv: any) => {
      allEvents.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        title: `${t('calendar.invoiceDue')}: ${inv.invoice_number}`,
        date: inv.due_date,
        color: TYPE_COLORS.invoice,
        entityId: inv.id,
      });
    });

    setEvents(allEvents);
    setLoading(false);
  }, [profile?.organization_id, dateRange, language, t]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.type === 'hearing' && !showHearings) return false;
      if (e.type === 'task' && !showTasks) return false;
      if (e.type === 'errand' && !showErrands) return false;
      if (e.type === 'event' && !showEvents) return false;
      if (e.type === 'invoice' && !showInvoices) return false;
      return true;
    });
  }, [events, showHearings, showTasks, showErrands, showEvents, showInvoices]);

  const handlePrev = () => {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (view === 'day') setCurrentDate(d => subDays(d, 1));
    else setCurrentDate(d => subDays(d, 14));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (view === 'day') setCurrentDate(d => addDays(d, 1));
    else setCurrentDate(d => addDays(d, 14));
  };

  const getDateLabel = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    return `${format(currentDate, 'MMM d')} – ${format(addDays(currentDate, 14), 'MMM d, yyyy')}`;
  };

  const handleEventClick = (ev: CalendarEvent) => {
    const rawId = ev.entityId || '';
    switch (ev.type) {
      case 'hearing':
        if (ev.caseId) navigate(`/cases/${ev.caseId}`);
        break;
      case 'task':
        setTaskDetailId(rawId);
        break;
      case 'errand':
        navigate(`/errands/${rawId}`);
        break;
      case 'event':
        setDetailEvent(ev);
        break;
      case 'invoice':
        navigate(`/billing/${rawId}`);
        break;
    }
  };

  const handleCellClick = (date: Date) => {
    setDefaultDate(format(date, 'yyyy-MM-dd'));
    setEditCalEvent(null);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    await supabase.from('calendar_events').delete().eq('id', deleteEventId);
    toast.success(t('calendar.messages.deleted'));
    setDeleteEventId(null);
    setDetailEvent(null);
    fetchEvents();
  };

  const getEventsForDate = (date: Date) =>
    filteredEvents.filter(e => isSameDay(new Date(e.date + 'T00:00:00'), date));

  const dayNames = language === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;

  // =================== MONTH VIEW ===================
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map(d => (
            <div key={d} className="text-body-sm font-medium text-muted-foreground text-center py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isWeekend = getDay(day) === 5 || getDay(day) === 6; // Fri/Sat for Iraq

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleCellClick(day)}
                className={cn(
                  'min-h-[110px] border-b border-e border-border p-1.5 cursor-pointer hover:bg-muted/30 transition-colors',
                  !isCurrentMonth && 'bg-muted/20',
                  isWeekend && isCurrentMonth && 'bg-muted/10',
                )}
              >
                <div className="flex justify-start mb-1">
                  <span className={cn(
                    'text-body-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    !isCurrentMonth && 'text-muted-foreground/50',
                    isCurrentMonth && 'text-foreground',
                    isTodayFn(day) && 'bg-accent text-accent-foreground',
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); handleEventClick(ev); }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: `${ev.color}15`, borderLeft: `3px solid ${ev.color}`, color: ev.color }}
                    >
                      {ev.time && <span className="flex-shrink-0">{ev.time.slice(0, 5)}</span>}
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <button onClick={e => { e.stopPropagation(); setCurrentDate(day); setView('day'); }} className="text-[11px] text-accent font-medium px-1.5">
                      {t('calendar.showMore', { count: String(dayEvents.length - 3) })}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // =================== WEEK VIEW ===================
  const renderWeekView = () => {
    const ws = startOfWeek(currentDate);
    const days = eachDayOfInterval({ start: ws, end: endOfWeek(currentDate) });
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8AM to 8PM

    return (
      <div className="overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
          <div className="text-body-sm text-muted-foreground text-center py-2" />
          {days.map(day => (
            <div key={day.toISOString()} className={cn('text-center py-2 border-s border-border', isTodayFn(day) && 'bg-accent/5')}>
              <div className="text-body-sm text-muted-foreground">{dayNames[getDay(day)]}</div>
              <div className={cn('text-body-md font-medium', isTodayFn(day) ? 'text-accent' : 'text-foreground')}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="h-[60px] text-body-sm text-muted-foreground text-end pe-2 pt-0 border-b border-border">
                {`${hour}:00`}
              </div>
              {days.map(day => {
                const dayEvs = getEventsForDate(day).filter(e => {
                  if (!e.time) return hour === 8;
                  const h = parseInt(e.time.split(':')[0]);
                  return h === hour;
                });
                return (
                  <div key={day.toISOString() + hour} className={cn('h-[60px] border-s border-b border-border relative', isTodayFn(day) && 'bg-accent/5')} onClick={() => handleCellClick(day)}>
                    {dayEvs.map(ev => (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); handleEventClick(ev); }} className="absolute inset-x-1 rounded px-1 py-0.5 text-[11px] font-medium truncate cursor-pointer" style={{ backgroundColor: `${ev.color}20`, borderLeft: `3px solid ${ev.color}`, color: ev.color, top: '2px' }}>
                        {ev.time?.slice(0, 5)} {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // =================== DAY VIEW ===================
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const allDayEvs = dayEvents.filter(e => !e.time);
    const timedEvs = dayEvents.filter(e => e.time);
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
      <div>
        {/* All-day */}
        {allDayEvs.length > 0 && (
          <div className="border-b border-border p-2 bg-muted/20">
            <span className="text-body-sm text-muted-foreground me-2">{t('calendar.allDay')}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {allDayEvs.map(ev => (
                <div key={ev.id} onClick={() => handleEventClick(ev)} className="px-2 py-1 rounded text-body-sm font-medium cursor-pointer" style={{ backgroundColor: `${ev.color}20`, borderLeft: `3px solid ${ev.color}`, color: ev.color }}>
                  {ev.title}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Timed */}
        <div className="grid grid-cols-[60px_1fr]">
          {hours.map(hour => {
            const hourEvs = timedEvs.filter(e => parseInt(e.time!.split(':')[0]) === hour);
            return (
              <React.Fragment key={hour}>
                <div className="h-[60px] text-body-sm text-muted-foreground text-end pe-2 border-b border-border">{`${hour}:00`}</div>
                <div className="h-[60px] border-b border-border relative" onClick={() => handleCellClick(currentDate)}>
                  {hourEvs.map(ev => (
                    <div key={ev.id} onClick={e => { e.stopPropagation(); handleEventClick(ev); }} className="absolute inset-x-2 rounded px-2 py-1 text-body-sm font-medium cursor-pointer" style={{ backgroundColor: `${ev.color}20`, borderLeft: `3px solid ${ev.color}`, color: ev.color, top: '2px' }}>
                      {ev.time?.slice(0, 5)} — {ev.title}
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // =================== AGENDA VIEW ===================
  const renderAgendaView = () => {
    const days = eachDayOfInterval({ start: currentDate, end: addDays(currentDate, 14) });
    return (
      <div className="space-y-4">
        {days.map(day => {
          const dayEvs = getEventsForDate(day);
          return (
            <div key={day.toISOString()}>
              <h3 className={cn('text-heading-sm text-foreground mb-2', isTodayFn(day) && 'text-accent')}>
                {format(day, 'EEEE, MMM d')}
                {isTodayFn(day) && <span className="ms-2 text-body-sm text-accent">({t('calendar.today')})</span>}
              </h3>
              {dayEvs.length === 0 ? (
                <p className="text-body-sm text-muted-foreground italic ps-4">{t('calendar.noEvents')}</p>
              ) : (
                <div className="space-y-2">
                  {dayEvs.map(ev => (
                    <div key={ev.id} onClick={() => handleEventClick(ev)} className="flex items-start gap-3 bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow" style={{ borderLeftWidth: '3px', borderLeftColor: ev.color }}>
                      <div className="flex-shrink-0 text-body-md font-medium text-foreground min-w-[50px]">
                        {ev.time ? ev.time.slice(0, 5) : t('calendar.allDay')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md font-medium text-foreground truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] capitalize px-1.5 py-0.5 rounded" style={{ backgroundColor: `${ev.color}15`, color: ev.color }}>
                            {t(`calendar.eventTypes.${ev.type === 'event' ? (ev.meta?.event_type || 'meeting') : (ev.type === 'hearing' ? 'hearing' : ev.type === 'task' ? 'task_due' : ev.type === 'errand' ? 'errand_due' : 'other')}`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={t('calendar.title')}
        titleAr={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        subtitleAr={t('calendar.subtitle')}
        actionLabel={t('calendar.addEvent')}
        actionLabelAr={t('calendar.addEvent')}
        onAction={() => { setEditCalEvent(null); setDefaultDate(format(currentDate, 'yyyy-MM-dd')); setShowEventModal(true); }}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: t('calendar.title'), labelAr: t('calendar.title') },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* View toggle */}
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} className={cn('px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors', view === v ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {t(`calendar.${v}`)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-body-md font-medium text-foreground min-w-[180px] text-center">{getDateLabel()}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="ms-1">
            {t('calendar.today')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {([
            { key: 'hearings', color: TYPE_COLORS.hearing, checked: showHearings, set: setShowHearings },
            { key: 'tasks', color: TYPE_COLORS.task, checked: showTasks, set: setShowTasks },
            { key: 'errands', color: TYPE_COLORS.errand, checked: showErrands, set: setShowErrands },
            { key: 'events', color: TYPE_COLORS.event, checked: showEvents, set: setShowEvents },
            { key: 'invoices', color: TYPE_COLORS.invoice, checked: showInvoices, set: setShowInvoices },
          ] as const).map(f => (
            <label key={f.key} className="flex items-center gap-1.5 cursor-pointer text-body-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
              <Checkbox checked={f.checked} onCheckedChange={(c) => f.set(!!c)} className="h-3.5 w-3.5" />
              <span className="text-muted-foreground">{t(`calendar.${f.key}`)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'agenda' && renderAgendaView()}
      </div>

      {/* Event form modal */}
      <EventFormModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSaved={fetchEvents}
        editEvent={editCalEvent}
        defaultDate={defaultDate}
      />

      {/* Event detail modal */}
      {detailEvent && detailEvent.type === 'event' && detailEvent.meta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDetailEvent(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[480px] w-[90%]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: detailEvent.color }} />
              <h3 className="text-heading-lg text-foreground">{detailEvent.title}</h3>
            </div>
            <StatusBadge status={detailEvent.meta.event_type} type="custom" customColor={detailEvent.color} className="mb-3" />
            <div className="space-y-2 text-body-md text-muted-foreground">
              <p>{format(new Date(detailEvent.meta.start_date + 'T00:00:00'), 'PPP')}{detailEvent.meta.start_time ? ` · ${detailEvent.meta.start_time.slice(0, 5)}` : ''}{detailEvent.meta.end_time ? ` – ${detailEvent.meta.end_time.slice(0, 5)}` : ''}</p>
              {detailEvent.meta.description && <p className="text-foreground">{detailEvent.meta.description}</p>}
              {detailEvent.meta.location && <p className="flex items-center gap-1"><MapPin size={14} /> {detailEvent.meta.location}</p>}
              {detailEvent.meta.is_virtual && detailEvent.meta.virtual_link && (
                <a href={detailEvent.meta.virtual_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:underline">
                  <Video size={14} /> {detailEvent.meta.virtual_link}
                </a>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => {
                setEditCalEvent(detailEvent.meta);
                setDetailEvent(null);
                setShowEventModal(true);
              }}>{t('common.edit')}</Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setDeleteEventId(detailEvent.meta.id); }}>{t('common.delete')}</Button>
              <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setDetailEvent(null)}>{t('common.close')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteEventId}
        onClose={() => setDeleteEventId(null)}
        onConfirm={handleDeleteEvent}
        title={t('calendar.deleteConfirmTitle')}
        titleAr={t('calendar.deleteConfirmTitle')}
        message={t('calendar.deleteConfirmMessage')}
        messageAr={t('calendar.deleteConfirmMessage')}
        type="danger"
      />

      {/* Task detail */}
      {taskDetailId && (
        <TaskDetailSlideOver
          isOpen={!!taskDetailId}
          onClose={() => setTaskDetailId(null)}
          taskId={taskDetailId}
          onUpdated={fetchEvents}
        />
      )}
    </div>
  );
}
