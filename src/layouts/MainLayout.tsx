import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import TopHeader from '@/components/TopHeader';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('qanuni_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('qanuni_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 start-0 z-50 lg:hidden">
            <AppSidebar
              collapsed={false}
              onToggle={() => setCollapsed(!collapsed)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          showMenu
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 2xl:p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Scale, Calendar, CheckSquare, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

function MobileBottomNav() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
    { key: 'cases', path: '/cases', icon: Scale },
    { key: 'calendar', path: '/calendar', icon: Calendar },
    { key: 'tasks', path: '/tasks', icon: CheckSquare },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 h-16 bg-card shadow-[0_-2px_10px_rgba(0,0,0,0.08)] flex items-center justify-around lg:hidden z-30">
      {items.map(item => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-accent' : 'text-muted-foreground'}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{t(`sidebar.${item.key}`)}</span>
          </button>
        );
      })}
      <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
        <MoreHorizontal className="h-5 w-5" />
        <span className="text-[10px]">More</span>
      </button>
    </div>
  );
}
