import { useTimer } from '@/contexts/TimerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Square, Clock } from 'lucide-react';

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function GlobalTimerBar() {
  const { isRunning, elapsedSeconds, activeTimer, stopTimer } = useTimer();
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  if (!isRunning || !activeTimer) return null;

  return (
    <div className="bg-accent text-accent-foreground px-4 py-2 flex items-center justify-center gap-4 border-b border-accent/40 z-30">
      <Clock className="h-4 w-4 shrink-0" />
      <span className="font-mono text-body-sm font-semibold tabular-nums">{fmt(elapsedSeconds)}</span>
      <span className="text-body-sm truncate max-w-[40vw]">{activeTimer.description}</span>
      <div className="flex items-center gap-2 ms-auto">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const confirmed = window.confirm(t('Stop and save this time entry?', 'هل تريد إيقاف المؤقت وحفظ سجل الوقت؟'));
            if (confirmed) void stopTimer();
          }}
          className="text-accent-foreground hover:bg-accent-foreground/10 h-8"
        >
          <Square className="h-3.5 w-3.5 me-1" />
          {t('Stop & Save', 'إيقاف وحفظ')}
        </Button>
      </div>
    </div>
  );
}
