import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell, CheckCheck, Settings, CheckSquare, Scale, FileCheck, Receipt,
  FileText, Calendar, AtSign, MoreHorizontal, Trash2, Eye, EyeOff,
} from 'lucide-react';
import NotificationPreferencesSlideOver from '@/components/notifications/NotificationPreferencesSlideOver';

interface Notification {
  id: string;
  title: string;
  title_ar: string | null;
  body: string | null;
  body_ar: string | null;
  notification_type: string;
  priority: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  actor_id: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  task: CheckSquare, case: Scale, errand: FileCheck, hearing: Scale,
  invoice: Receipt, document: FileText, event: Calendar, mention: AtSign,
};

const TYPE_COLORS: Record<string, string> = {
  task:     'bg-info-light text-info',
  case:     'bg-success-light text-success',
  errand:   'bg-accent/10 text-accent-dark',
  hearing:  'bg-error-light text-error',
  invoice:  'bg-warning-light text-warning',
  document: 'bg-muted text-muted-foreground',
  event:    'bg-secondary text-foreground/70',
  mention:  'bg-accent/10 text-accent-dark',
};

function getTypeKey(nt: string): string {
  if (nt.startsWith('task_')) return 'task';
  if (nt.startsWith('case_')) return 'case';
  if (nt.startsWith('errand_')) return 'errand';
  if (nt.startsWith('invoice_') || nt === 'payment_received') return 'invoice';
  if (nt.startsWith('document_')) return 'document';
  if (nt.startsWith('event_')) return 'event';
  if (nt === 'mention') return 'mention';
  return 'event';
}

function relativeTime(dateStr: string, lang: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return lang === 'ar' ? 'الآن' : 'Just now';
  if (m < 60) return lang === 'ar' ? `منذ ${m} د` : `${m}m ago`;
  if (h < 24) return lang === 'ar' ? `منذ ${h} س` : `${h}h ago`;
  return lang === 'ar' ? `منذ ${d} ي` : `${d}d ago`;
}

function groupNotifications(items: Notification[], lang: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; items: Notification[] }[] = [];
  const t: Notification[] = [], y: Notification[] = [], w: Notification[] = [], e: Notification[] = [];

  items.forEach(n => {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) t.push(n);
    else if (d.getTime() === yesterday.getTime()) y.push(n);
    else if (d.getTime() >= weekAgo.getTime()) w.push(n);
    else e.push(n);
  });

  if (t.length) groups.push({ label: lang === 'ar' ? 'اليوم' : 'Today', items: t });
  if (y.length) groups.push({ label: lang === 'ar' ? 'أمس' : 'Yesterday', items: y });
  if (w.length) groups.push({ label: lang === 'ar' ? 'هذا الأسبوع' : 'This Week', items: w });
  if (e.length) groups.push({ label: lang === 'ar' ? 'سابقاً' : 'Earlier', items: e });
  return groups;
}

const READ_FILTERS = ['all', 'unread', 'read'] as const;
const TYPE_FILTERS = ['all', 'tasks', 'cases', 'errands', 'billing', 'documents', 'events', 'mentions'] as const;
const PRIORITY_FILTERS = ['all', 'normal', 'high', 'urgent'] as const;

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<typeof READ_FILTERS[number]>('all');
  const [typeFilter, setTypeFilter] = useState<typeof TYPE_FILTERS[number]>('all');
  const [priorityFilter, setPriorityFilter] = useState<typeof PRIORITY_FILTERS[number]>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!profile?.id) return;
    setLoading(true);
    const from = reset ? 0 : page * 20;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .range(from, from + 19);
    if (data) {
      setNotifications(prev => reset ? data as Notification[] : [...prev, ...data as Notification[]]);
      setHasMore(data.length === 20);
    }
    setLoading(false);
  }, [profile?.id, page]);

  useEffect(() => { fetchNotifications(true); }, [profile?.id]);

  const loadMore = () => {
    setPage(p => p + 1);
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = notifications.filter(n => {
    if (readFilter === 'unread' && n.is_read) return false;
    if (readFilter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all') {
      const tk = getTypeKey(n.notification_type);
      const map: Record<string, string[]> = {
        tasks: ['task'], cases: ['case', 'hearing'], errands: ['errand'],
        billing: ['invoice'], documents: ['document'], events: ['event'], mentions: ['mention'],
      };
      if (!map[typeFilter]?.includes(tk)) return false;
    }
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
    return true;
  });

  const groups = groupNotifications(filtered, language);

  const markAllRead = async () => {
    if (!profile?.id) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
  };

  const toggleRead = async (id: string, current: boolean) => {
    await supabase.from('notifications').update({ is_read: !current, read_at: !current ? new Date().toISOString() : null }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: !current } : n));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const bulkMarkRead = async (read: boolean) => {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id =>
      supabase.from('notifications').update({ is_read: read, read_at: read ? new Date().toISOString() : null }).eq('id', id)
    ));
    setNotifications(prev => prev.map(n => selected.has(n.id) ? { ...n, is_read: read } : n));
    setSelected(new Set());
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => supabase.from('notifications').delete().eq('id', id)));
    setNotifications(prev => prev.filter(n => !selected.has(n.id)));
    setSelected(new Set());
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (!n.entity_type || !n.entity_id) return;
    switch (n.entity_type) {
      case 'case': navigate(`/cases/${n.entity_id}`); break;
      case 'errand': navigate(`/errands/${n.entity_id}`); break;
      case 'task': navigate('/tasks'); break;
      case 'invoice': navigate(`/billing/${n.entity_id}`); break;
      case 'document': navigate('/documents'); break;
      case 'event': navigate('/calendar'); break;
      case 'hearing': navigate(`/cases/${n.entity_id}`); break;
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const title = (n: Notification) => language === 'ar' && n.title_ar ? n.title_ar : n.title;
  const body = (n: Notification) => language === 'ar' && n.body_ar ? n.body_ar : n.body;

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-body-sm transition-colors ${active ? 'bg-accent text-accent-foreground font-semibold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <PageHeader
        title={t('notifications.title')}
        titleAr={language === 'ar' ? 'الإشعارات' : 'Notifications'}
        subtitle={unreadCount > 0 ? `${unreadCount} ${language === 'ar' ? 'إشعارات غير مقروءة' : 'unread notifications'}` : undefined}
        helpKey="notifications"
        secondaryActions={[
          ...(unreadCount > 0 ? [{
            label: 'Mark All as Read',
            labelAr: 'تعيين الكل كمقروء',
            icon: CheckCheck,
            onClick: markAllRead,
          }] : []),
          {
            label: 'Settings',
            labelAr: 'الإعدادات',
            icon: Settings,
            onClick: () => setPrefsOpen(true),
          },
        ]}
      />

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        {READ_FILTERS.map(f => filterBtn(
          f === 'all' ? (language === 'ar' ? 'الكل' : 'All') : f === 'unread' ? (language === 'ar' ? 'غير مقروءة' : 'Unread') : (language === 'ar' ? 'مقروءة' : 'Read'),
          readFilter === f, () => setReadFilter(f)
        ))}
        <span className="w-px h-5 bg-border mx-1" />
        {TYPE_FILTERS.map(f => filterBtn(
          f === 'all' ? (language === 'ar' ? 'الكل' : 'All') :
          f === 'tasks' ? (language === 'ar' ? 'المهام' : 'Tasks') :
          f === 'cases' ? (language === 'ar' ? 'القضايا' : 'Cases') :
          f === 'errands' ? (language === 'ar' ? 'المعاملات' : 'Errands') :
          f === 'billing' ? (language === 'ar' ? 'الفوترة' : 'Billing') :
          f === 'documents' ? (language === 'ar' ? 'المستندات' : 'Documents') :
          f === 'events' ? (language === 'ar' ? 'الأحداث' : 'Events') :
          (language === 'ar' ? 'الإشارات' : 'Mentions'),
          typeFilter === f, () => setTypeFilter(f)
        ))}
        <span className="w-px h-5 bg-border mx-1" />
        {PRIORITY_FILTERS.map(f => filterBtn(
          f === 'all' ? (language === 'ar' ? 'الكل' : 'All') :
          f === 'normal' ? (language === 'ar' ? 'عادي' : 'Normal') :
          f === 'high' ? (language === 'ar' ? 'عالي' : 'High') :
          (language === 'ar' ? 'عاجل' : 'Urgent'),
          priorityFilter === f, () => setPriorityFilter(f)
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
          <span className="text-body-sm font-medium">{selected.size} {language === 'ar' ? 'محدد' : 'selected'}</span>
          <Button variant="ghost" size="sm" onClick={() => bulkMarkRead(true)}>
            <Eye size={14} className="me-1" />{language === 'ar' ? 'تعيين كمقروء' : 'Mark Read'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => bulkMarkRead(false)}>
            <EyeOff size={14} className="me-1" />{language === 'ar' ? 'تعيين كغير مقروء' : 'Mark Unread'}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={bulkDelete}>
            <Trash2 size={14} className="me-1" />{language === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        </div>
      )}

      {/* List */}
      <div className="mt-4 space-y-2">
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No notifications"
            titleAr="لا توجد إشعارات"
            subtitle="You're all caught up!"
            subtitleAr="أنت على اطلاع بكل شيء!"
          />
        )}
        {groups.map(group => (
          <div key={group.label}>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2 px-1">
              {group.label}
            </div>
            {group.items.map(n => {
              const tk = n.entity_type || getTypeKey(n.notification_type);
              const Icon = TYPE_ICONS[tk] || Bell;
              const colorClass = TYPE_COLORS[tk] || 'bg-muted text-muted-foreground';
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border bg-card mb-2 transition-colors hover:bg-muted/30 cursor-pointer ${!n.is_read ? 'border-s-[3px] border-s-blue-500' : ''}`}
                >
                  <Checkbox
                    checked={selected.has(n.id)}
                    onCheckedChange={() => toggleSelect(n.id)}
                    className="mt-1 shrink-0"
                  />
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
                    onClick={() => handleClick(n)}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => handleClick(n)}>
                    <p className={`text-body-md ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                      {title(n)}
                    </p>
                    {body(n) && (
                      <p className="text-body-sm text-muted-foreground mt-0.5">{body(n)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {relativeTime(n.created_at, language)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleRead(n.id, n.is_read)}>
                          {n.is_read ? (language === 'ar' ? 'تعيين كغير مقروء' : 'Mark as Unread') : (language === 'ar' ? 'تعيين كمقروء' : 'Mark as Read')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteNotification(n.id)} className="text-destructive">
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {hasMore && filtered.length > 0 && (
          <div className="text-center py-4">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...') : (language === 'ar' ? 'تحميل المزيد' : 'Load More')}
            </Button>
          </div>
        )}
      </div>

      <NotificationPreferencesSlideOver open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
  );
}
