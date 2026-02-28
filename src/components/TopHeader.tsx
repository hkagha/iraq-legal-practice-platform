import { Search, Bell, Menu } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TopHeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export default function TopHeader({ onMenuClick, showMenu }: TopHeaderProps) {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="h-16 bg-card shadow-xs flex items-center px-4 gap-3 shrink-0 z-10">
      {/* Mobile hamburger */}
      {showMenu && (
        <button
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Spacer for desktop */}
      <div className="flex-1 flex justify-center">
        {/* Search bar */}
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

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="h-9 w-9 rounded-button bg-secondary flex items-center justify-center text-[13px] font-semibold text-foreground hover:bg-slate-200 transition-colors"
        >
          {language === 'en' ? 'AR' : 'EN'}
        </button>

        {/* Notifications */}
        <button className="h-9 w-9 rounded-button flex items-center justify-center hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-error" />
        </button>

        {/* Avatar */}
        <button className="h-9 w-9 rounded-avatar bg-accent text-accent-foreground flex items-center justify-center text-body-md font-semibold">
          AR
        </button>
      </div>
    </header>
  );
}
