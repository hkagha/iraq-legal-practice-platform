import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Scale, FileCheck, Users, Calendar, CheckSquare,
  FileText, Clock, Receipt, BarChart3, MessageSquare, Sparkles,
  UserCog, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const mainNavItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'cases', path: '/cases', icon: Scale },
  { key: 'errands', path: '/errands', icon: FileCheck },
  { key: 'clients', path: '/clients', icon: Users },
  { key: 'calendar', path: '/calendar', icon: Calendar },
  { key: 'tasks', path: '/tasks', icon: CheckSquare },
  { key: 'documents', path: '/documents', icon: FileText },
  { key: 'timeTracking', path: '/time-tracking', icon: Clock },
  { key: 'billing', path: '/billing', icon: Receipt },
  { key: 'reports', path: '/reports', icon: BarChart3 },
];

const secondaryNavItems = [
  { key: 'messages', path: '/messages', icon: MessageSquare },
  { key: 'research', path: '/research', icon: Sparkles },
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
  const location = useLocation();
  const [hasUrgentCases, setHasUrgentCases] = useState(false);
  const [overdueErrandsCount, setOverdueErrandsCount] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const check = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [urgentRes, overdueRes] = await Promise.all([
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
      ]);
      setHasUrgentCases((urgentRes.count || 0) > 0);
      setOverdueErrandsCount(overdueRes.count || 0);
    };
    check();
  }, [profile?.organization_id]);

  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  const renderNavItem = (item: typeof mainNavItems[0]) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    const Icon = item.icon;
    const label = t(`sidebar.${item.key}`);
    const showDot = (item.key === 'cases' && hasUrgentCases) || (item.key === 'errands' && overdueErrandsCount > 0);
    const showCount = item.key === 'errands' && overdueErrandsCount > 0;
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
            <span className="absolute -top-1 -end-1 h-2 w-2 rounded-full bg-[#EF4444]" />
          )}
        </div>
        {!collapsed && (
          <span className="text-body-md font-medium truncate flex-1">{label}</span>
        )}
        {!collapsed && showCount && (
          <span className="text-[11px] font-semibold rounded-full bg-destructive text-destructive-foreground min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {overdueErrandsCount}
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
