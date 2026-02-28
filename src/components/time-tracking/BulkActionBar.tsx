import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle, DollarSign, Trash2, X } from 'lucide-react';

interface BulkActionBarProps {
  count: number;
  selectedEntries: any[];
  onSubmit: () => void;
  onApprove: () => void;
  onMarkBillable: (billable: boolean) => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function BulkActionBar({ count, selectedEntries, onSubmit, onApprove, onMarkBillable, onDelete, onClear }: BulkActionBarProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const allDraft = selectedEntries.every(e => e.status === 'draft');
  const allSubmitted = selectedEntries.every(e => e.status === 'submitted');
  const isFirmAdmin = profile?.role === 'firm_admin';

  return (
    <div className="bg-primary text-primary-foreground rounded-lg shadow-md h-12 px-4 flex items-center justify-between mb-3 animate-in slide-in-from-top duration-200">
      <span className="text-body-md font-medium">
        {count} {t('selected', 'محدد')}
      </span>
      <div className="flex items-center gap-1">
        {allDraft && (
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 h-8" onClick={onSubmit}>
            <Send size={14} className="me-1" /> {t('Submit', 'تقديم')}
          </Button>
        )}
        {allSubmitted && isFirmAdmin && (
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 h-8" onClick={onApprove}>
            <CheckCircle size={14} className="me-1" /> {t('Approve', 'موافقة')}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 h-8" onClick={() => onMarkBillable(true)}>
          <DollarSign size={14} className="me-1" /> {t('Billable', 'قابل للفوترة')}
        </Button>
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 h-8" onClick={() => onMarkBillable(false)}>
          {t('Non-Billable', 'غير قابل')}
        </Button>
        {allDraft && (
          <Button variant="ghost" size="sm" className="text-destructive-foreground hover:bg-destructive/20 h-8" onClick={onDelete}>
            <Trash2 size={14} className="me-1" /> {t('Delete', 'حذف')}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 h-8" onClick={onClear}>
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
