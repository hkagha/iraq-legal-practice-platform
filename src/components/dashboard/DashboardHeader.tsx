import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, Plus, Clock } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardHeader() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const firstName = profile?.first_name || '';

  const today = new Date();
  const dateStr = language === 'en'
    ? today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : today.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-display-lg text-foreground">
          {t('dashboard.welcomeMessage', { name: firstName })}
        </h1>
        <p className="text-body-md text-muted-foreground mt-1">{dateStr}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-2 h-10 px-4 rounded-button bg-accent text-accent-foreground text-body-md font-semibold hover:bg-accent-dark transition-colors shrink-0">
            {t('dashboard.quickActions')}
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px] shadow-md rounded-card">
          <DropdownMenuItem onClick={() => navigate('/cases/new')} className="gap-2 h-10 cursor-pointer">
            <Plus className="h-4 w-4" /> {t('dashboard.newCase')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/errands/new')} className="gap-2 h-10 cursor-pointer">
            <Plus className="h-4 w-4" /> {t('dashboard.newErrand')}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 h-10 cursor-pointer">
            <Plus className="h-4 w-4" /> {t('dashboard.newClient')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/time-tracking')} className="gap-2 h-10 cursor-pointer">
            <Clock className="h-4 w-4" /> {t('dashboard.logTime')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
