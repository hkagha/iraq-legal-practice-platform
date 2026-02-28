import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/lib/notificationSound';
import {
  Bell, CheckSquare, Scale, FileCheck, Receipt, FileText,
  Calendar, AtSign, AlertTriangle, X,
} from 'lucide-react';

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
  task: CheckSquare,
  case: Scale,
  errand: FileCheck,
  hearing: Scale,
  invoice: Receipt,
  document: FileText,
  event: Calendar,
  mention: AtSign,
};

const TYPE_COLORS: Record<string, string> = {
  task: 'bg-blue-100 text-blue-600',
  case: 'bg-emerald-100 text-emerald-600',
  errand: 'bg-purple-100 text-purple-600',
  hearing: 'bg-red-100 text-red-600',
  invoice: 'bg-amber-100 text-amber-600',
  document: 'bg-slate-100 text-slate-600',
  event: 'bg-yellow-100 text-yellow-700',
  mention: 'bg-pink-100 text-pink-600',
};

function getTypeFromNotificationType(nt: string): string {
  if (nt.startsWith('task_')) return 'task';
  if (nt.startsWith('case_') || nt.startsWith('case_hearing')) return 'case';
  if (nt.startsWith('errand_')) return 'errand';
  if (nt.startsWith('invoice_') || nt === 'payment_received') return 'invoice';
  if (nt.startsWith('document_')) return 'document';
  if (nt.startsWith('event_')) return 'event';
  if (nt === 'mention') return 'mention';
  return 'event';
}

function relativeTime(dateStr: string, language: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return language === 'ar' ? 'الآن' : 'Just now';
  if (diffMin < 60) return language === 'ar' ? `منذ ${diffMin} د` : `${diffMin}m ago`;
  if (diffHr < 24) return language === 'ar' ? `منذ ${diffHr} س` : `${diffHr}h ago`;
  return language === 'ar' ? `منذ ${diffDay} ي` : `${diffDay}d ago`;
}

function groupByDate(notifications: Notification[], language: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  notifications.forEach(n => {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayItems.push(n);
    else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
    else earlierItems.push(n);
  });

  if (todayItems.length) groups.push({ label: language === 'ar' ? 'اليوم' : 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: language === 'ar' ? 'أمس' : 'Yesterday', items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: language === 'ar' ? 'سابقاً' : 'Earlier', items: earlierItems });

  return groups;
}

export default function NotificationBell() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const groups = groupByDate(filtered, language);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription with sound
  useEffect(() => {
    if (!profile?.id) return;

    // Fetch sound preference
    let soundEnabled = true;
    supabase.from('notification_preferences').select('sound_enabled').eq('user_id', profile.id).maybeSingle()
      .then(({ data }) => { if (data) soundEnabled = data.sound_enabled ?? true; });

    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        // Play sound if enabled and tab is visible
        if (soundEnabled) {
          playNotificationSound(0.3);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    if (!profile?.id) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    setOpen(false);
    if (!n.entity_type || !n.entity_id) return;
    switch (n.entity_type) {
      case 'case': navigate(`/cases/${n.entity_id}`); break;
      case 'errand': navigate(`/errands/${n.entity_id}`); break;
      case 'task': navigate('/tasks'); break;
      case 'invoice': navigate(`/billing/${n.entity_id}`); break;
      case 'document': navigate('/documents'); break;
      case 'event': navigate('/calendar'); break;
      case 'hearing': navigate(`/cases/${n.entity_id}`); break;
      default: break;
    }
  };

  const title = (n: Notification) => language === 'ar' && n.title_ar ? n.title_ar : n.title;
  const body = (n: Notification) => language === 'ar' && n.body_ar ? n.body_ar : n.body;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors relative"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-white text-[11px] font-semibold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 end-0 w-[400px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-heading-sm text-foreground">{t('notifications.title')}</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-error/10 text-error font-semibold rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-body-sm text-accent hover:underline">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-4 px-4 pt-2 pb-1 border-b border-border">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-body-sm pb-1.5 border-b-2 transition-colors ${filter === f ? 'border-accent text-accent font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {f === 'all' ? (language === 'ar' ? 'الكل' : 'All') : (language === 'ar' ? 'غير مقروءة' : 'Unread')}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-body-sm text-muted-foreground">{t('common.loading')}</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-body-md text-muted-foreground">{t('notifications.noNotifications')}</p>
                <p className="text-body-sm text-muted-foreground/70 mt-1">{t('notifications.noNotificationsSubtitle')}</p>
              </div>
            )}
            {!loading && groups.map(group => (
              <div key={group.label}>
                <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  {group.label}
                </div>
                {group.items.map(n => {
                  const typeKey = n.entity_type || getTypeFromNotificationType(n.notification_type);
                  const Icon = TYPE_ICONS[typeKey] || Bell;
                  const colorClass = TYPE_COLORS[typeKey] || 'bg-muted text-muted-foreground';
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-body-md truncate ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {title(n)}
                        </p>
                        {body(n) && (
                          <p className="text-body-sm text-muted-foreground truncate mt-0.5">{body(n)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {relativeTime(n.created_at, language)}
                        </span>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 text-center">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-body-sm text-accent hover:underline"
            >
              {t('notifications.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
