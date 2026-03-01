import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Building, Users, BarChart3,
  Settings, Megaphone, Database, Server, ChevronLeft, ChevronRight,
  ClipboardList, LogOut, Scale
} from 'lucide-react';

const adminNavItems = [
  { key: 'dashboard', path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', labelAr: 'لوحة التحكم' },
  { key: 'divider1', divider: true },
  { key: 'organizations', path: '/admin/organizations', icon: Building, label: 'Organizations', labelAr: 'المؤسسات' },
  { key: 'users', path: '/admin/users', icon: Users, label: 'Users', labelAr: 'المستخدمون' },
  { key: 'divider2', divider: true },
  { key: 'analytics', path: '/admin/analytics', icon: BarChart3, label: 'Analytics', labelAr: 'التحليلات' },
  { key: 'divider3', divider: true },
  { key: 'backups', path: '/admin/backups', icon: Database, label: 'Backups', labelAr: 'النسخ الاحتياطي' },
  { key: 'divider4', divider: true },
  { key: 'announcements', path: '/admin/announcements', icon: Megaphone, label: 'Announcements', labelAr: 'الإعلانات' },
  { key: 'audit', path: '/admin/audit-log', icon: ClipboardList, label: 'Audit Log', labelAr: 'سجل المراجعة' },
  { key: 'settings', path: '/admin/settings', icon: Settings, label: 'Platform Settings', labelAr: 'إعدادات المنصة' },
  { key: 'divider5', divider: true },
  { key: 'health', path: '/admin/system-health', icon: Server, label: 'System Health', labelAr: 'صحة النظام' },
];

export default function AdminLayout() {
  const { language, setLanguage, isRTL } = useLanguage();
  const { signOut, getInitials } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const isEN = language === 'en';

  const CollapseIcon = isRTL ? (collapsed ? ChevronLeft : ChevronRight) : (collapsed ? ChevronRight : ChevronLeft);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <div className={`hidden lg:flex flex-col shrink-0 bg-primary text-primary-foreground transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        {/* Logo */}
        <div className="h-[72px] flex items-center border-b border-primary-foreground/10 px-4 gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4 text-accent" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-heading-sm text-primary-foreground">QANUNI</span>
              <span className="text-body-sm bg-accent text-primary px-1.5 py-0.5 rounded font-semibold">ADMIN</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {adminNavItems.map(item => {
            if ((item as any).divider) {
              return <div key={item.key} className="h-px bg-primary-foreground/10 mx-4 my-2" />;
            }
            const isActive = location.pathname === item.path;
            const Icon = item.icon!;
            const label = isEN ? item.label : item.labelAr;

            const link = (
              <NavLink
                to={item.path!}
                className={`relative flex items-center gap-3 h-10 rounded-md mx-2 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${isActive ? 'bg-primary-foreground/10 text-primary-foreground' : 'text-primary-foreground/60 hover:bg-primary-foreground/5 hover:text-primary-foreground/80'}`}
              >
                {isActive && (
                  <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1.5 bottom-1.5 w-[3px] bg-accent rounded-sm`} />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
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
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-primary-foreground/10 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-body-sm font-semibold">{getInitials()}</div>
              <div className="min-w-0">
                <p className="text-body-sm text-primary-foreground truncate">Super Admin</p>
                <button onClick={handleSignOut} className="text-body-sm text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors flex items-center gap-1">
                  <LogOut className="h-3 w-3" /> {isEN ? 'Sign Out' : 'خروج'}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end">
            <button onClick={() => setCollapsed(!collapsed)} className="h-7 w-7 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
              <CollapseIcon className="h-4 w-4 text-primary-foreground/70" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-card border-b flex items-center justify-between px-6 shrink-0">
          <div className="text-body-sm text-muted-foreground">{isEN ? 'Platform Administration' : 'إدارة المنصة'}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-body-sm font-semibold text-foreground hover:bg-muted/80">
              {language === 'en' ? 'AR' : 'EN'}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 2xl:p-8 bg-background">
          <div className="max-w-[1400px] mx-auto"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
