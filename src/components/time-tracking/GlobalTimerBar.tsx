import React from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import LogTimeModal from '@/components/time-tracking/LogTimeModal';
import { toast } from 'sonner';

export default function GlobalTimerBar() {
  const { activeTimer, elapsedSeconds, stopTimer, discardTimer } = useTimer();
  const { language } = useLanguage();
  const [showDiscard, setShowDiscard] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);

  if (!activeTimer) return null;

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  const handleStopClick = () => {
    setShowSaveModal(true);
  };

  const handleSaveComplete = async () => {
    // The modal handles the DB update; we just clear local timer state
    await stopTimer();
  };

  const handleDiscard = async () => {
    await discardTimer();
    setShowDiscard(false);
    toast.info(language === 'ar' ? 'تم تجاهل المؤقت' : 'Timer discarded');
  };

  const badge = activeTimer.case_number || activeTimer.errand_number;

  return (
    <>
      <div className="h-12 bg-accent/10 border-b-2 border-accent px-6 flex items-center justify-between shrink-0 animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
          </span>
          <span className="text-body-sm font-medium text-accent">
            {language === 'ar' ? 'المؤقت يعمل' : 'Timer Running'}
          </span>
          <span className="text-body-sm text-muted-foreground truncate max-w-[200px]">
            {activeTimer.description}
          </span>
          {badge && (
            <span className="text-body-sm bg-muted px-2 py-0.5 rounded-md">{badge}</span>
          )}
        </div>

        <div className="text-display-sm text-primary font-bold tabular-nums">
          {timeStr}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleStopClick} className="bg-accent text-accent-foreground hover:bg-accent/90 h-8">
            <Square size={14} className="me-1" />
            {language === 'ar' ? 'إيقاف وحفظ' : 'Stop & Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDiscard(true)} className="h-8">
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Save modal after stopping */}
      <LogTimeModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSaved={handleSaveComplete}
        timerEntry={{
          id: activeTimer.id,
          description: activeTimer.description,
          case_id: activeTimer.case_id || undefined,
          errand_id: activeTimer.errand_id || undefined,
          client_id: activeTimer.client_id || undefined,
          durationMinutes,
          date: new Date().toISOString().split('T')[0],
        }}
      />

      <ConfirmDialog
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        title="Discard Timer"
        titleAr="تجاهل المؤقت"
        message="Are you sure you want to discard this timer? The tracked time will be lost."
        messageAr="هل أنت متأكد من تجاهل هذا المؤقت؟ سيتم حذف السجل."
        onConfirm={handleDiscard}
        confirmLabel="Discard"
        confirmLabelAr="تجاهل"
        type="danger"
      />
    </>
  );
}
