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
  UserCog, Settings, ChevronLeft, ChevronRight, Activity, Bell
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const mainNavItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'clients', path: '/clients', icon: Users },
  { key: 'cases', path: '/cases', icon: Scale },
  { key: 'errands', path: '/errands', icon: FileCheck },
  { key: 'documents', path: '/documents', icon: FileText },
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
  { key: 'team', path: '/team', icon: UserCog },
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
        className={`
          flex items-center gap-3 h-11 rounded-button mx-2 transition-colors relative
          ${collapsed ? 'justify-center px-0' : 'px-3'}
          ${isActive
            ? 'bg-[rgba(201,168,76,0.15)] text-white'
            : 'text-white/70 hover:bg-white/5 hover:text-white/90'
          }
        `}
      >
        {isActive && (
          <div className={`absolute ${isRTL ? 'right-0 rounded-l-sm' : 'left-0 rounded-r-sm'} top-1.5 bottom-1.5 w-[3px] bg-accent`} />
        )}
        <div className="relative">
          <Icon className="h-5 w-5 shrink-0" />
          {showDot && !showCount && (
            <span className={cn('absolute -top-1 -end-1 h-2 w-2 rounded-full', item.key === 'timeTracking' ? 'bg-[#EF4444] animate-pulse' : 'bg-[#EF4444]')} />
          )}
        </div>
        {!collapsed && (
          <span className="text-body-md font-medium truncate flex-1">{label}</span>
        )}
        {!collapsed && showCount && (
          <span className={cn(
            'text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
            item.key === 'documents' ? 'bg-accent text-accent-foreground' : item.key === 'calendar' ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground',
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

  const divider = (
    <div className="mx-4 my-2 h-px bg-white/10" />
  );

  return (
    <div
      className={`
        flex flex-col h-full bg-primary text-white transition-all duration-200
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      <div className="h-16 flex items-center border-b border-white/10 px-4 shrink-0">
        <div className={`flex flex-col ${collapsed ? 'items-center w-full' : ''}`}>
          <span className="text-[22px] font-bold text-white leading-tight">
            {collapsed ? 'Q' : 'Qanuni'}
          </span>
          {!collapsed && (
            <span className="text-body-sm text-white/50">
              {language === 'en' ? 'قانوني' : 'Qanuni'}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {mainNavItems.map(renderNavItem)}
        {divider}
        {!collapsed && (
          <div className="mx-4 mb-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            {language === 'ar' ? 'أدوات ذكية' : 'AI Tools'}
          </div>
        )}
        {aiNavItems.map(renderNavItem)}
        {divider}
        {secondaryNavItems.map(renderNavItem)}
        {divider}
        {bottomNavItems.map(renderNavItem)}
      </nav>

      <div className="shrink-0 border-t border-white/10 h-16 flex items-center justify-between px-3">
        {!collapsed && (
          <span className="text-body-sm text-white/50 truncate">
            Al-Rashid Law Firm
          </span>
        )}
        <button
          onClick={onToggle}
          className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <CollapseIcon className="h-4 w-4 text-white/70" />
        </button>
      </div>
    </div>
  );
}
