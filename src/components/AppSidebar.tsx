import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTimer } from '@/contexts/TimerContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Scale, FileCheck, Users, Calendar, CheckSquare,
  FileText, Clock, Receipt, BarChart3, MessageSquare, Sparkles,
  UserCog, Settings, ChevronLeft, ChevronRight, Activity, Bell, Archive
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const mainNavItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'clients', path: '/clients', icon: Users },
  { key: 'cases', path: '/cases', icon: Scale },
  { key: 'errands', path: '/errands', icon: FileCheck },
  { key: 'documents', path: '/documents', icon: FileText },
  { key: 'archive', path: '/documents/archive', icon: Sparkles },
  { key: 'archived', path: '/documents/archived', icon: Archive },
  { key: 'timeTracking', path: '/time-tracking', icon: Clock },
  { key: 'billing', path: '/billing', icon: Receipt },
  { key: 'tasks', path: '/tasks', icon: CheckSquare },
  { key: 'calendar', path: '/calendar', icon: Calendar },
  { key: 'reports', path: '/reports', icon: BarChart3 },
];

const aiNavItems = [
  { key: 'aiDraft', path: '/ai/draft', icon: FileText },
  { key: 'aiResearch', path: '/ai/research', icon: Sparkles },
  { key: 'aiTranslate', path: '/ai/translate', icon: MessageSquare },
];

const secondaryNavItems = [
  { key: 'activity', path: '/activity', icon: Activity },
  { key: 'notifications', path: '/notifications', icon: Bell },
];

const bottomNavItems = [
  { key: 'settings', path: '/settings', icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

export default function AppSidebar({ collapsed, onToggle, onClose }: AppSidebarProps) {
  const { t, isRTL, language } = useLanguage();
  const { profile } = useAuth();
  const { activeTimer } = useTimer();
  const location = useLocation();
  const [hasUrgentCases, setHasUrgentCases] = useState(false);
  const [overdueErrandsCount, setOverdueErrandsCount] = useState(0);
  const [recentDocsCount, setRecentDocsCount] = useState(0);
  const [overdueInvoicesCount, setOverdueInvoicesCount] = useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState(0);
  const [todayEventsCount, setTodayEventsCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const check = async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const [urgentRes, overdueRes, recentDocsRes, overdueInvRes, overdueTasksRes, todayEventsRes] = await Promise.all([
        supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .eq('priority', 'urgent')
          .not('status', 'in', '("closed","archived")'),
        supabase
          .from('errands')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .lt('due_date', today)
          .not('status', 'in', '("completed","cancelled","approved","rejected")'),
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .eq('status', 'active')
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .lt('due_date', today)
          .in('status', ['sent', 'viewed', 'partially_paid']),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .lt('due_date', today)
          .not('status', 'in', '("completed","cancelled")'),
        supabase
          .from('calendar_events')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', profile.organization_id!)
          .eq('start_date', today),
      ]);
      setHasUrgentCases((urgentRes.count || 0) > 0);
      setOverdueErrandsCount(overdueRes.count || 0);
      setRecentDocsCount(recentDocsRes.count || 0);
      setOverdueInvoicesCount(overdueInvRes.count || 0);
      setOverdueTasksCount(overdueTasksRes.count || 0);
      setTodayEventsCount(todayEventsRes.count || 0);

      // Unread notifications count
      if (profile?.id) {
        const { count: unreadCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_read', false);
        setUnreadNotifCount(unreadCount || 0);
      }

      // Auto-check overdue invoices — update status
      if ((overdueInvRes.count || 0) > 0) {
        await supabase
          .from('invoices')
          .update({ status: 'overdue' } as any)
          .eq('organization_id', profile.organization_id!)
          .lt('due_date', today)
          .in('status', ['sent', 'viewed']);
      }
    };
    check();
    // Refresh every 60 seconds
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [profile?.organization_id, profile?.id]);

  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  const renderNavItem = (item: typeof mainNavItems[0]) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const Icon = item.icon;
    const label = t(`sidebar.${item.key}`);
    const showDot = (item.key === 'cases' && hasUrgentCases) || (item.key === 'timeTracking' && !!activeTimer);
    const showCount = (item.key === 'errands' && overdueErrandsCount > 0) || (item.key === 'documents' && recentDocsCount > 0 && !isActive) || (item.key === 'billing' && overdueInvoicesCount > 0) || (item.key === 'tasks' && overdueTasksCount > 0) || (item.key === 'calendar' && todayEventsCount > 0) || (item.key === 'notifications' && unreadNotifCount > 0);
    const countValue = item.key === 'errands' ? overdueErrandsCount : item.key === 'billing' ? overdueInvoicesCount : item.key === 'tasks' ? overdueTasksCount : item.key === 'calendar' ? todayEventsCount : item.key === 'notifications' ? unreadNotifCount : recentDocsCount;
    const link = (
      <NavLink
        to={item.path}
        onClick={onClose}
        className={cn(
          'group relative flex items-center gap-3 h-10 mx-3 px-3 transition-colors',
          collapsed ? 'justify-center px-0 mx-2' : '',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
        )}
      >
        <div className="relative">
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          {showDot && !showCount && (
            <span className={cn('absolute -top-1 -end-1 h-1.5 w-1.5 rounded-full', item.key === 'timeTracking' ? 'bg-destructive animate-pulse' : 'bg-destructive')} />
          )}
        </div>
        {!collapsed && (
          <span className="text-[13px] font-medium truncate flex-1 tracking-tight">{label}</span>
        )}
        {!collapsed && showCount && (
          <span className={cn(
            'text-[10px] font-bold tabular min-w-[18px] h-[18px] flex items-center justify-center px-1',
            isActive
              ? 'bg-accent text-accent-foreground'
              : item.key === 'documents' || item.key === 'calendar'
                ? 'bg-accent text-accent-foreground'
                : 'bg-destructive text-destructive-foreground',
          )}>
            {countValue}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side={isRTL ? 'left' : 'right'} className="font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.key}>{link}</div>;
  };

  const sectionLabel = (text: string) => (
    !collapsed ? (
      <div className="px-6 mt-6 mb-2 eyebrow">{text}</div>
    ) : (
      <div className="mx-4 my-3 h-px bg-border" />
    )
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <div className="h-16 flex items-center border-b border-sidebar-border px-6 shrink-0">
        <div className={cn('flex flex-col', collapsed && 'items-center w-full')}>
          <span className="font-display text-[22px] font-semibold text-foreground leading-none tracking-tight">
            {collapsed ? 'Q' : 'QANUNI'}
          </span>
          {!collapsed && (
            <span className="text-[10px] mt-1 small-caps text-muted-foreground">
              {language === 'en' ? 'Legal Practice' : 'الممارسة القانونية'}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {sectionLabel(language === 'ar' ? 'الممارسة' : 'Practice')}
        <div className="space-y-0.5">{mainNavItems.map(renderNavItem)}</div>

        {sectionLabel(language === 'ar' ? 'أدوات ذكية' : 'Intelligence')}
        <div className="space-y-0.5">{aiNavItems.map(renderNavItem)}</div>

        {sectionLabel(language === 'ar' ? 'النظام' : 'System')}
        <div className="space-y-0.5">{secondaryNavItems.map(renderNavItem)}</div>
        <div className="space-y-0.5 mt-0.5">{bottomNavItems.map(renderNavItem)}</div>
      </nav>

      <div className="shrink-0 border-t border-sidebar-border h-14 flex items-center justify-between px-4">
        {!collapsed && (
          <span className="text-[11px] small-caps text-muted-foreground truncate">
            Al-Rashid Law Firm
          </span>
        )}
        <button
          onClick={onToggle}
          className="h-7 w-7 hover:bg-secondary flex items-center justify-center transition-colors shrink-0"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <CollapseIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
