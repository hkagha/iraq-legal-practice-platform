import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import TopHeader from '@/components/TopHeader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Building, Users, CreditCard, BarChart3,
  Settings, Megaphone, Database, Server, ChevronLeft, ChevronRight
} from 'lucide-react';

const adminNavItems = [
  { key: 'dashboard', path: '/admin/dashboard', icon: LayoutDashboard, tKey: 'admin.dashboard' },
  { key: 'organizations', path: '/admin/organizations', icon: Building, tKey: 'admin.organizations' },
  { key: 'users', path: '/admin/users', icon: Users, tKey: 'admin.allUsers' },
  { key: 'backups', path: '/admin/backups', icon: Database, tKey: 'admin.backups' },
  { key: 'subscriptions', path: '/admin/subscriptions', icon: CreditCard, tKey: 'admin.subscriptions' },
  { key: 'analytics', path: '/admin/analytics', icon: BarChart3, tKey: 'admin.platformAnalytics' },
  { key: 'settings', path: '/admin/settings', icon: Settings, tKey: 'admin.systemSettings' },
  { key: 'announcements', path: '/admin/announcements', icon: Megaphone, tKey: 'admin.announcements' },
];

export default function AdminLayout() {
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const CollapseIcon = isRTL ? (collapsed ? ChevronLeft : ChevronRight) : (collapsed ? ChevronRight : ChevronLeft);

  const renderNavItem = (item: typeof adminNavItems[0]) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const label = t(item.tKey);

    const link = (
      <NavLink
        to={item.path}
        className={`flex items-center gap-3 h-11 rounded-button mx-2 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? 'bg-[rgba(59,130,246,0.15)] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white/90'}`}
      >
        {isActive && (
          <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1.5 bottom-1.5 w-[3px] bg-info rounded-sm`} />
        )}
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-body-md font-medium truncate">{label}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side={isRTL ? 'left' : 'right'}>{label}</TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.key}>{link}</div>;
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className={`hidden lg:flex flex-col shrink-0 bg-primary text-white transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        <div className="h-16 flex items-center border-b border-white/10 px-4">
          <span className="text-[22px] font-bold">{collapsed ? 'Q' : 'Qanuni Admin'}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {adminNavItems.map(renderNavItem)}
        </nav>
        <div className="border-t border-white/10 h-16 flex items-center justify-end px-3">
          <button onClick={() => setCollapsed(!collapsed)} className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <CollapseIcon className="h-4 w-4 text-white/70" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-6 2xl:p-8">
          <div className="max-w-[1400px] mx-auto"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
