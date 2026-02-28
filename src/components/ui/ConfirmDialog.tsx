import React, { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  confirmLabel?: string;
  confirmLabelAr?: string;
  cancelLabel?: string;
  cancelLabelAr?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const typeConfig = {
  danger: { bg: '#FEF2F2', color: '#EF4444', Icon: AlertTriangle, btnClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
  warning: { bg: '#FFFBEB', color: '#F59E0B', Icon: AlertTriangle, btnClass: 'bg-warning text-white hover:bg-warning/90' },
  info: { bg: '#EFF6FF', color: '#3B82F6', Icon: Info, btnClass: 'bg-info text-white hover:bg-info/90' },
};

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, titleAr, message, messageAr,
  confirmLabel = 'Confirm', confirmLabelAr = 'تأكيد',
  cancelLabel = 'Cancel', cancelLabelAr = 'إلغاء',
  type = 'danger', isLoading = false,
}: ConfirmDialogProps) {
  const { language } = useLanguage();
  const cfg = typeConfig[type];

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isLoading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !isLoading && onClose()}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[420px] w-[90%] mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
            <cfg.Icon size={24} style={{ color: cfg.color }} />
          </div>
        </div>
        <h3 className="text-heading-lg text-foreground text-center mt-4">{language === 'ar' ? titleAr : title}</h3>
        <p className="text-body-md text-muted-foreground text-center mt-2">{language === 'ar' ? messageAr : message}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose} disabled={isLoading}>
            {language === 'ar' ? cancelLabelAr : cancelLabel}
          </Button>
          <Button className={cn('flex-1 h-10', cfg.btnClass)} onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {language === 'ar' ? confirmLabelAr : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
