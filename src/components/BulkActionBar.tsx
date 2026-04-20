import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children?: ReactNode;
}

/**
 * Reusable top-sliding primary-navy bulk action bar matching the existing
 * Documents bulk-action pattern. Renders as a fixed strip when items selected.
 */
export default function BulkActionBar({ count, onClear, children }: BulkActionBarProps) {
  const { language } = useLanguage();
  const isEN = language === 'en';
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 2xl:-mx-8 mb-4 bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-150">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 h-14 flex items-center gap-3">
        <button
          onClick={onClear}
          aria-label={isEN ? 'Clear selection' : 'مسح التحديد'}
          className="h-9 w-9 flex items-center justify-center hover:bg-primary-foreground/10 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-body-sm font-medium">
          {isEN ? `${count} selected` : `${count} عنصر محدد`}
        </span>
        <div className="ms-auto flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
