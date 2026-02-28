import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, X, CheckSquare, Calendar, Clock, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onNewTask: () => void;
  onNewEvent: () => void;
  onLogTime: () => void;
  onNewClient: () => void;
}

export default function MobileFAB({ onNewTask, onNewEvent, onLogTime, onNewClient }: Props) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: CheckSquare, label: language === 'ar' ? 'مهمة جديدة' : 'New Task', onClick: onNewTask, color: '#3B82F6' },
    { icon: Calendar, label: language === 'ar' ? 'حدث جديد' : 'New Event', onClick: onNewEvent, color: '#C9A84C' },
    { icon: Clock, label: language === 'ar' ? 'تسجيل وقت' : 'Log Time', onClick: onLogTime, color: '#22C55E' },
    { icon: UserPlus, label: language === 'ar' ? 'عميل جديد' : 'New Client', onClick: onNewClient, color: '#8B5CF6' },
  ];

  return (
    <div className="fixed bottom-20 end-4 z-50 lg:hidden">
      {open && (
        <div className="flex flex-col gap-3 mb-3">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); a.onClick(); }}
              className="flex items-center gap-2 bg-card border border-border rounded-full shadow-lg px-4 py-2.5 text-body-sm font-medium text-foreground hover:bg-muted/50 transition-all animate-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <a.icon className="h-4 w-4" style={{ color: a.color }} />
              {a.label}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all',
          open ? 'bg-muted-foreground' : 'bg-accent'
        )}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-accent-foreground" />}
      </button>
    </div>
  );
}
