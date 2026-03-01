import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Scale, FileCheck, FileText, MessageSquare,
  Receipt, User, LogOut, Globe,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const portalNav = [
  { path: '/portal/dashboard', icon: LayoutDashboard, tKey: 'portal.dashboard' },
  { path: '/portal/cases', icon: Scale, tKey: 'portal.myCases' },
  { path: '/portal/errands', icon: FileCheck, tKey: 'portal.myErrands' },
  { path: '/portal/documents', icon: FileText, tKey: 'portal.myDocuments' },
  { path: '/portal/invoices', icon: Receipt, tKey: 'portal.myInvoices' },
  { path: '/portal/messages', icon: MessageSquare, tKey: 'portal.messages' },
];

export default function ClientLayout() {
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { profile, organization, signOut, getFullName, getInitials } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
            ) : (
              organization?.name || 'Qanuni'
            )}
          </span>
          <span className="text-muted-foreground text-body-sm hidden sm:inline">|</span>
          <span className="text-body-sm text-muted-foreground hidden sm:inline">{t('portal.title')}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="h-8 px-2 rounded-md text-body-sm text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1"
          >
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'AR' : 'EN'}
          </button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-9 px-2 rounded-md hover:bg-secondary transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-accent/20 text-accent text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-body-sm font-medium text-foreground hidden sm:inline">{getFullName()}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
              <DropdownMenuItem onClick={() => navigate('/portal/profile')}>
                <User className="h-4 w-4 me-2" /> {t('portal.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 me-2" /> {t('portal.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Horizontal nav */}
      <nav className="bg-card border-b border-border shrink-0 overflow-x-auto">
        <div className="max-w-[1100px] mx-auto flex items-center gap-1 px-4 md:px-6">
          {portalNav.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/portal/dashboard' && location.pathname.startsWith(item.path + '/'));
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-body-sm font-medium whitespace-nowrap transition-colors border-b-2',
                  isActive
                    ? 'text-accent border-accent bg-accent/5'
                    : 'text-muted-foreground border-transparent hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.tKey)}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 bg-card border-t border-border flex items-center justify-center shrink-0">
        <span className="text-body-sm text-muted-foreground">{t('portal.poweredBy')}</span>
      </footer>
    </div>
  );
}
