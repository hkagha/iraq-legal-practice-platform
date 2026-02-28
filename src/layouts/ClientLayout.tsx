import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import TopHeader from '@/components/TopHeader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Scale, FileCheck, FileText, MessageSquare,
  Receipt, User, ChevronLeft, ChevronRight
} from 'lucide-react';

const clientNavItems = [
  { key: 'myDashboard', path: '/portal/dashboard', icon: LayoutDashboard, tKey: 'clientPortal.myDashboard' },
  { key: 'myCases', path: '/portal/cases', icon: Scale, tKey: 'clientPortal.myCases' },
  { key: 'myErrands', path: '/portal/errands', icon: FileCheck, tKey: 'clientPortal.myErrands' },
  { key: 'documents', path: '/portal/documents', icon: FileText, tKey: 'sidebar.documents' },
  { key: 'messages', path: '/portal/messages', icon: MessageSquare, tKey: 'sidebar.messages' },
  { key: 'invoices', path: '/portal/invoices', icon: Receipt, tKey: 'clientPortal.invoices' },
  { key: 'myProfile', path: '/portal/profile', icon: User, tKey: 'clientPortal.myProfile' },
];

export default function ClientLayout() {
  const { t, isRTL, language } = useLanguage();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const CollapseIcon = isRTL ? (collapsed ? ChevronLeft : ChevronRight) : (collapsed ? ChevronRight : ChevronLeft);

  const renderNavItem = (item: typeof clientNavItems[0]) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const label = t(item.tKey);

    const link = (
      <NavLink
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 h-11 rounded-button mx-2 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/70 hover:bg-secondary hover:text-foreground'}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-body-md truncate">{label}</span>}
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
      {/* Sidebar - white variant for clients */}
      <div className={`hidden lg:flex flex-col shrink-0 bg-card border-e border-border transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        <div className="h-16 flex items-center border-b border-border px-4">
          <span className="text-[22px] font-bold text-primary">{collapsed ? 'Q' : 'Qanuni'}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {clientNavItems.map(renderNavItem)}
        </nav>
        <div className="border-t border-border h-16 flex items-center justify-end px-3">
          <button onClick={() => setCollapsed(!collapsed)} className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center hover:bg-slate-200 transition-colors">
            <CollapseIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader showMenu onMenuClick={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-y-auto p-6 2xl:p-8">
          <div className="max-w-[1400px] mx-auto"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
