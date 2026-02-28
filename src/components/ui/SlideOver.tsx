import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const widthMap = { sm: 'max-w-[400px]', md: 'max-w-[520px]', lg: 'max-w-[640px]', xl: 'max-w-[800px]' };

export function SlideOver({ isOpen, onClose, title, titleAr, subtitle, subtitleAr, width = 'md', children, footer }: SlideOverProps) {
  const { language, isRTL } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Trap focus
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity duration-300', isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 z-50 w-full bg-card shadow-xl flex flex-col outline-none transition-transform duration-300',
          widthMap[width],
          isRTL ? 'start-0' : 'end-0',
          isOpen
            ? 'translate-x-0'
            : isRTL ? '-translate-x-full' : 'translate-x-full',
          'max-sm:max-w-full',
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-heading-lg text-foreground">{language === 'ar' ? titleAr : title}</h2>
            {(subtitle || subtitleAr) && (
              <p className="text-body-sm text-muted-foreground">{language === 'ar' ? subtitleAr : subtitle}</p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-button hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="h-[72px] flex items-center justify-end gap-3 px-6 border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
