import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, Bell, Menu, User, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface TopHeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export default function TopHeader({ onMenuClick, showMenu }: TopHeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const { profile, getFullName, getInitials, signOut, isRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-card shadow-xs flex items-center px-4 gap-3 shrink-0 z-10">
      {showMenu && (
        <button
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}

      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-[400px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            className="w-full h-10 bg-secondary border border-border rounded-card ps-9 pe-12 text-body-md text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors"
          />
          <kbd className="absolute end-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded bg-slate-200 px-1.5 text-[11px] font-medium text-slate-500">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="h-9 w-9 rounded-button bg-secondary flex items-center justify-center text-[13px] font-semibold text-foreground hover:bg-slate-200 transition-colors"
        >
          {language === 'en' ? 'AR' : 'EN'}
        </button>

        <button className="h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-error" />
        </button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 rounded-avatar bg-accent text-accent-foreground flex items-center justify-center text-body-md font-semibold focus:outline-none">
              {getInitials() || 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] shadow-lg rounded-card p-1">
            {/* User info */}
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-avatar bg-accent text-accent-foreground flex items-center justify-center text-body-sm font-semibold">
                  {getInitials() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-heading-sm text-foreground truncate">{getFullName()}</p>
                  <p className="text-body-sm text-muted-foreground truncate">{profile?.email}</p>
                  <span className="inline-block mt-1 text-body-sm bg-secondary rounded-badge px-2 py-0.5 capitalize">{profile?.role?.replace('_', ' ')}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              {language === 'en' ? 'My Profile' : 'ملفي الشخصي'}
            </DropdownMenuItem>
            {isRole('firm_admin') && (
              <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                {t('sidebar.settings')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-error focus:text-error">
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
