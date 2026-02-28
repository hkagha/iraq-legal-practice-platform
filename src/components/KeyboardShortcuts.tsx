import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Props {
  onNewTask: () => void;
  onNewEvent: () => void;
  onStartTimer: () => void;
  onFocusSearch: () => void;
}

export default function KeyboardShortcuts({ onNewTask, onNewEvent, onStartTimer, onFocusSearch }: Props) {
  const { language } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      if (isInput) return;

      if (e.key === 't' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onNewTask();
      } else if (e.key === 'e' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onNewEvent();
      } else if (e.key === 'T' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onStartTimer();
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onFocusSearch();
      } else if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShowHelp(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewTask, onNewEvent, onStartTimer, onFocusSearch]);

  const shortcuts = [
    { key: 'T', label: language === 'ar' ? 'مهمة جديدة' : 'New Task' },
    { key: 'E', label: language === 'ar' ? 'حدث جديد' : 'New Event' },
    { key: 'Shift+T', label: language === 'ar' ? 'بدء المؤقت' : 'Start Timer' },
    { key: '/', label: language === 'ar' ? 'تركيز البحث' : 'Focus Search' },
    { key: 'Esc', label: language === 'ar' ? 'إغلاق' : 'Close' },
    { key: '?', label: language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Show Shortcuts' },
  ];

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-20 lg:bottom-4 end-4 h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors z-30 shadow-sm"
        title={language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
      >
        <Keyboard className="h-4 w-4" />
      </button>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {shortcuts.map(s => (
              <div key={s.key} className="flex items-center justify-between py-1.5">
                <span className="text-body-md text-foreground">{s.label}</span>
                <kbd className="inline-flex h-6 items-center rounded bg-muted px-2 text-body-sm font-mono text-muted-foreground border border-border">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
