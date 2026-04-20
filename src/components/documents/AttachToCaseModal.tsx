import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentIds: string[];
  onAttached?: () => void;
}

export default function AttachToCaseModal({ isOpen, onClose, documentIds, onAttached }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [caseId, setCaseId] = useState('');
  const [errandId, setErrandId] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !profile?.organization_id) return;
    (async () => {
      const [c, e] = await Promise.all([
        supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id!).order('case_number', { ascending: false }).limit(200),
        supabase.from('errands').select('id, errand_number, title').eq('organization_id', profile.organization_id!).order('errand_number', { ascending: false }).limit(200),
      ]);
      setCases(c.data || []);
      setErrands(e.data || []);
    })();
  }, [isOpen, profile?.organization_id]);

  const handleAttach = async () => {
    if (!caseId && !errandId) {
      toast.error(t('Select a case or errand', 'اختر قضية أو معاملة'));
      return;
    }
    if (!documentIds.length) {
      onClose();
      return;
    }
    setSaving(true);
    const updates: Record<string, any> = {};
    if (caseId) updates.case_id = caseId;
    if (errandId) updates.errand_id = errandId;
    const { error } = await supabase.from('documents').update(updates).in('id', documentIds);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t(`Attached ${documentIds.length} document(s)`, `تم إرفاق ${documentIds.length} مستند`));
    setCaseId('');
    setErrandId('');
    onAttached?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Attach to Case or Errand', 'إرفاق بقضية أو معاملة')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-body-sm text-muted-foreground">
            {t(`${documentIds.length} document(s) selected`, `${documentIds.length} مستند مختار`)}
          </p>
          <div>
            <Label className="text-body-sm">{t('Case', 'القضية')}</Label>
            <FormSearchSelect value={caseId} onChange={(v) => { setCaseId(v); if (v) setErrandId(''); }} options={cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.title}` }))} placeholder={t('None', 'بدون')} />
          </div>
          <div className="text-center text-caption text-muted-foreground">{t('— or —', '— أو —')}</div>
          <div>
            <Label className="text-body-sm">{t('Errand', 'المعاملة')}</Label>
            <FormSearchSelect value={errandId} onChange={(v) => { setErrandId(v); if (v) setCaseId(''); }} options={errands.map((e) => ({ value: e.id, label: `${e.errand_number} — ${e.title}` }))} placeholder={t('None', 'بدون')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('Cancel', 'إلغاء')}</Button>
          <Button onClick={handleAttach} disabled={saving || (!caseId && !errandId)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? t('Attaching…', 'جارٍ الإرفاق…') : t('Attach', 'إرفاق')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
