import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onSaved?: () => void;
  defaultCaseId?: string;
  prefillCaseId?: string;
  defaultErrandId?: string;
  prefillErrandId?: string;
  entryId?: string;
  editEntry?: { id: string } | null;
}

export default function LogTimeModal(props: Props) {
  const isOpen = props.open ?? props.isOpen ?? false;
  const onClose = () => {
    props.onClose?.();
    props.onOpenChange?.(false);
  };
  const onSaved = props.onSaved;
  const defaultCaseId = props.prefillCaseId ?? props.defaultCaseId;
  const defaultErrandId = props.prefillErrandId ?? props.defaultErrandId;
  const entryId = props.editEntry?.id ?? props.entryId;
  const { profile } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [caseId, setCaseId] = useState(defaultCaseId || '');
  const [errandId, setErrandId] = useState(defaultErrandId || '');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [isBillable, setIsBillable] = useState(true);
  const [billingRate, setBillingRate] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !profile?.organization_id) return;
    (async () => {
      const [c, e] = await Promise.all([
        supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id!).order('case_number', { ascending: false }).limit(100),
        supabase.from('errands').select('id, errand_number, title').eq('organization_id', profile.organization_id!).order('errand_number', { ascending: false }).limit(100),
      ]);
      setCases(c.data || []);
      setErrands(e.data || []);
    })();
  }, [isOpen, profile?.organization_id]);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    supabase.from('time_entries').select('*').eq('id', entryId).single().then(({ data }) => {
      if (!data) return;
      setDate(data.date);
      setDescription(data.description || '');
      setCaseId(data.case_id || '');
      setErrandId(data.errand_id || '');
      setHours(String(Math.floor(data.duration_minutes / 60)));
      setMinutes(String(data.duration_minutes % 60));
      setIsBillable(data.is_billable);
      setBillingRate(data.billing_rate ? String(data.billing_rate) : '');
    });
  }, [isOpen, entryId]);

  const reset = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setCaseId(defaultCaseId || '');
    setErrandId(defaultErrandId || '');
    setHours('0');
    setMinutes('0');
    setIsBillable(true);
    setBillingRate('');
  };

  const handleSave = async () => {
    if (!profile?.id || !profile?.organization_id) return;
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes <= 0) {
      toast.error(t('Duration must be greater than 0', 'المدة يجب أن تكون أكبر من 0'));
      return;
    }
    if (!description.trim()) {
      toast.error(t('Description is required', 'الوصف مطلوب'));
      return;
    }

    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      user_id: profile.id,
      description: description.trim(),
      date,
      duration_minutes: totalMinutes,
      case_id: caseId || null,
      errand_id: errandId || null,
      is_billable: isBillable,
      billing_rate: isBillable && billingRate ? parseFloat(billingRate) : null,
      status: 'draft' as const,
    };

    const { error } = entryId
      ? await supabase.from('time_entries').update(payload).eq('id', entryId)
      : await supabase.from('time_entries').insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(entryId ? t('Time entry updated', 'تم تحديث الإدخال') : t('Time entry logged', 'تم تسجيل الوقت'));
    reset();
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entryId ? t('Edit Time Entry', 'تعديل إدخال الوقت') : t('Log Time', 'تسجيل الوقت')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-body-sm">{t('Date', 'التاريخ')}</Label>
            <FormInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-body-sm">{t('Description', 'الوصف')} *</Label>
            <FormTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" placeholder={t('What did you work on?', 'ماذا أنجزت؟')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-body-sm">{t('Hours', 'ساعات')}</Label>
              <FormInput type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-body-sm">{t('Minutes', 'دقائق')}</Label>
              <FormInput type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-body-sm">{t('Case', 'القضية')}</Label>
            <FormSearchSelect value={caseId} onChange={setCaseId} options={cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.title}` }))} placeholder={t('None', 'بدون')} />
          </div>
          <div>
            <Label className="text-body-sm">{t('Errand', 'المعاملة')}</Label>
            <FormSearchSelect value={errandId} onChange={setErrandId} options={errands.map((e) => ({ value: e.id, label: `${e.errand_number} — ${e.title}` }))} placeholder={t('None', 'بدون')} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label className="text-body-sm">{t('Billable', 'قابل للفوترة')}</Label>
            <Switch checked={isBillable} onCheckedChange={setIsBillable} />
          </div>
          {isBillable && (
            <div>
              <Label className="text-body-sm">{t('Hourly Rate (IQD)', 'السعر بالساعة (د.ع)')}</Label>
              <FormInput type="number" min="0" value={billingRate} onChange={(e) => setBillingRate(e.target.value)} className="mt-1" placeholder={t('Uses default if empty', 'استخدم الافتراضي إذا فارغ')} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('Cancel', 'إلغاء')}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? t('Saving…', 'جارِ الحفظ…') : t('Save', 'حفظ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
