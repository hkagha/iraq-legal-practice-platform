import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormInput } from '@/components/ui/FormInput';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LogTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  editEntry?: any;
  /** Pre-fill from timer stop flow — duration is locked */
  timerEntry?: { id: string; description: string; case_id?: string; errand_id?: string; client_id?: string; durationMinutes: number; date: string };
  /** Pre-fill case/errand from navigation */
  prefillCaseId?: string;
  prefillErrandId?: string;
}

type LinkMode = 'case' | 'errand' | 'neither';

const QUICK_DURATIONS = [
  { label: '15m', h: 0, m: 15 },
  { label: '30m', h: 0, m: 30 },
  { label: '1h', h: 1, m: 0 },
  { label: '1.5h', h: 1, m: 30 },
  { label: '2h', h: 2, m: 0 },
  { label: '3h', h: 3, m: 0 },
  { label: '4h', h: 4, m: 0 },
];

export default function LogTimeModal({ open, onOpenChange, onSaved, editEntry, timerEntry, prefillCaseId, prefillErrandId }: LogTimeModalProps) {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('0');
  const [timeMode, setTimeMode] = useState<'duration' | 'startend'>('duration');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [billingRate, setBillingRate] = useState('');
  const [rateSource, setRateSource] = useState('');
  const [linkMode, setLinkMode] = useState<LinkMode>('neither');
  const [caseId, setCaseId] = useState('');
  const [errandId, setErrandId] = useState('');
  const [clientId, setClientId] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const isTimerStop = !!timerEntry;
  const isEdit = !!editEntry;

  // Load reference data
  useEffect(() => {
    if (!open || !profile?.organization_id) return;
    const load = async () => {
      const [casesRes, errandsRes, clientsRes] = await Promise.all([
        supabase.from('cases').select('id, case_number, title, client_id, hourly_rate').eq('organization_id', profile.organization_id!).not('status', 'in', '("closed","archived")').order('case_number', { ascending: false }).limit(100),
        supabase.from('errands').select('id, errand_number, title, client_id').eq('organization_id', profile.organization_id!).not('status', 'in', '("completed","cancelled")').order('errand_number', { ascending: false }).limit(100),
        supabase.from('clients').select('id, first_name, last_name, company_name, client_type').eq('organization_id', profile.organization_id!).eq('status', 'active').order('created_at', { ascending: false }).limit(100),
      ]);
      setCases(casesRes.data || []);
      setErrands(errandsRes.data || []);
      setClients(clientsRes.data || []);
    };
    load();
  }, [open, profile?.organization_id]);

  // Initialize form based on mode (edit/timer/new)
  useEffect(() => {
    if (!open) return;
    if (editEntry) {
      setDescription(editEntry.description || '');
      setDate(new Date(editEntry.date + 'T00:00:00'));
      const h = Math.floor((editEntry.duration_minutes || 60) / 60);
      const m = (editEntry.duration_minutes || 60) % 60;
      setHours(String(h));
      setMinutes(String(m));
      setIsBillable(editEntry.is_billable ?? true);
      setBillingRate(editEntry.billing_rate ? String(editEntry.billing_rate) : '');
      if (editEntry.case_id) { setLinkMode('case'); setCaseId(editEntry.case_id); }
      else if (editEntry.errand_id) { setLinkMode('errand'); setErrandId(editEntry.errand_id); }
      else { setLinkMode('neither'); }
      setClientId(editEntry.client_id || '');
      setStartTime(editEntry.start_time?.slice(0, 5) || '');
      setEndTime(editEntry.end_time?.slice(0, 5) || '');
    } else if (timerEntry) {
      setDescription(timerEntry.description || '');
      setDate(new Date(timerEntry.date + 'T00:00:00'));
      const h = Math.floor(timerEntry.durationMinutes / 60);
      const m = timerEntry.durationMinutes % 60;
      setHours(String(h));
      setMinutes(String(m));
      setIsBillable(true);
      setBillingRate('');
      if (timerEntry.case_id) { setLinkMode('case'); setCaseId(timerEntry.case_id); }
      else if (timerEntry.errand_id) { setLinkMode('errand'); setErrandId(timerEntry.errand_id); }
      else { setLinkMode('neither'); }
      setClientId(timerEntry.client_id || '');
    } else {
      setDescription('');
      setDate(new Date());
      setHours('1');
      setMinutes('0');
      setIsBillable(true);
      setBillingRate('');
      setRateSource('');
      setStartTime('');
      setEndTime('');
      setClientId('');
      if (prefillCaseId) { setLinkMode('case'); setCaseId(prefillCaseId); }
      else if (prefillErrandId) { setLinkMode('errand'); setErrandId(prefillErrandId); }
      else { setLinkMode('neither'); setCaseId(''); setErrandId(''); }
    }
  }, [open, editEntry, timerEntry, prefillCaseId, prefillErrandId]);

  // Auto-fill client when case/errand is selected
  useEffect(() => {
    if (linkMode === 'case' && caseId) {
      const c = cases.find(x => x.id === caseId);
      if (c?.client_id) setClientId(c.client_id);
    } else if (linkMode === 'errand' && errandId) {
      const e = errands.find(x => x.id === errandId);
      if (e?.client_id) setClientId(e.client_id);
    }
  }, [linkMode, caseId, errandId, cases, errands]);

  // Auto-fill billing rate
  useEffect(() => {
    if (!open || !isBillable || !profile?.organization_id || editEntry) return;
    const fetchRate = async () => {
      // 1. User + case rate
      if (caseId && user) {
        const { data } = await supabase.from('billing_rates').select('rate').eq('organization_id', profile.organization_id!).eq('user_id', user.id).eq('case_id', caseId).maybeSingle();
        if (data) { setBillingRate(String(data.rate)); setRateSource(t('From user+case rate', 'من سعر المستخدم+القضية')); return; }
      }
      // 2. Case hourly_rate
      if (caseId) {
        const c = cases.find(x => x.id === caseId);
        if (c?.hourly_rate) { setBillingRate(String(c.hourly_rate)); setRateSource(t('From case rate', 'من سعر القضية')); return; }
      }
      // 3. User default rate
      if (user) {
        const { data } = await supabase.from('billing_rates').select('rate').eq('organization_id', profile.organization_id!).eq('user_id', user.id).is('case_id', null).maybeSingle();
        if (data) { setBillingRate(String(data.rate)); setRateSource(t('From your default rate', 'من سعرك الافتراضي')); return; }
      }
      // 4. Org default rate
      const { data } = await supabase.from('billing_rates').select('rate').eq('organization_id', profile.organization_id!).eq('is_default', true).maybeSingle();
      if (data) { setBillingRate(String(data.rate)); setRateSource(t('From default rate', 'من السعر الافتراضي')); return; }
      setBillingRate('');
      setRateSource('');
    };
    fetchRate();
  }, [open, isBillable, caseId, user, profile?.organization_id, cases, editEntry]);

  const durationMinutes = useMemo(() => {
    if (timeMode === 'startend' && startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    }
    return (parseInt(hours || '0') * 60) + parseInt(minutes || '0');
  }, [timeMode, hours, minutes, startTime, endTime]);

  const calculatedAmount = useMemo(() => {
    if (!isBillable || !billingRate || durationMinutes <= 0) return 0;
    return (durationMinutes / 60) * parseFloat(billingRate);
  }, [isBillable, billingRate, durationMinutes]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-IQ' : 'en-IQ', { style: 'decimal', maximumFractionDigits: 2 }).format(amount) + ' IQD';

  const caseOptions = useMemo(() => cases.map(c => ({ value: c.id, label: `${c.case_number} — ${c.title}` })), [cases]);
  const errandOptions = useMemo(() => errands.map(e => ({ value: e.id, label: `${e.errand_number} — ${e.title}` })), [errands]);
  const clientOptions = useMemo(() => clients.map(c => ({
    value: c.id,
    label: c.client_type === 'company' ? c.company_name : `${c.first_name} ${c.last_name}`,
  })), [clients]);

  const handleSave = async () => {
    if (!description.trim() || description.trim().length < 5) {
      toast.error(t('Description must be at least 5 characters', 'يجب أن يكون الوصف 5 أحرف على الأقل'));
      return;
    }
    if (durationMinutes <= 0) {
      toast.error(t('Duration must be greater than 0', 'المدة يجب أن تكون أكبر من 0'));
      return;
    }
    setSaving(true);
    const payload: any = {
      description,
      date: date.toISOString().split('T')[0],
      duration_minutes: durationMinutes,
      is_billable: isBillable,
      billing_rate: isBillable && billingRate ? parseFloat(billingRate) : null,
      case_id: linkMode === 'case' ? caseId || null : null,
      errand_id: linkMode === 'errand' ? errandId || null : null,
      client_id: clientId || null,
      start_time: startTime || null,
      end_time: endTime || null,
    };

    let error;
    if (isTimerStop && timerEntry) {
      // Update existing timer entry
      payload.is_timer_running = false;
      payload.timer_started_at = null;
      ({ error } = await supabase.from('time_entries').update(payload).eq('id', timerEntry.id));
    } else if (isEdit) {
      ({ error } = await supabase.from('time_entries').update(payload).eq('id', editEntry.id));
    } else {
      payload.organization_id = profile!.organization_id;
      payload.user_id = user!.id;
      payload.status = 'draft';
      ({ error } = await supabase.from('time_entries').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        isTimerStop ? t('Timer stopped and entry saved', 'توقف المؤقت وتم حفظ السجل') :
        isEdit ? t('Time entry updated', 'تم تحديث سجل الوقت') :
        t('Time entry logged', 'تم تسجيل الوقت')
      );
      onOpenChange(false);
      onSaved?.();
    }
  };

  const title = isTimerStop
    ? t('Save Timer Entry', 'حفظ سجل المؤقت')
    : isEdit
    ? t('Edit Time Entry', 'تعديل سجل الوقت')
    : t('Log Time', 'تسجيل وقت');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Description */}
          <div>
            <Label>{t('What did you work on?', 'ما الذي عملت عليه؟')} *</Label>
            <FormTextarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('Describe the work performed...', 'صف العمل المنجز...')}
              className="mt-1 min-h-[60px]"
              rows={2}
            />
          </div>

          {/* Link mode */}
          <div>
            <Label className="mb-2 block">{t('Link to', 'ربط بـ')}</Label>
            <div className="flex gap-2">
              {(['case', 'errand', 'neither'] as LinkMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setLinkMode(mode); if (mode !== 'case') setCaseId(''); if (mode !== 'errand') setErrandId(''); }}
                  className={`px-3 py-1.5 rounded-full text-body-sm font-medium border transition-colors ${linkMode === mode ? 'bg-accent text-accent-foreground border-accent' : 'bg-background text-muted-foreground border-border hover:bg-muted/50'}`}
                >
                  {mode === 'case' ? t('Case', 'قضية') : mode === 'errand' ? t('Errand', 'معاملة') : t('Neither', 'بدون')}
                </button>
              ))}
            </div>
            {linkMode === 'case' && (
              <div className="mt-2">
                <FormSearchSelect value={caseId} onChange={setCaseId} options={caseOptions} placeholder={t('Search cases...', 'البحث في القضايا...')} />
              </div>
            )}
            {linkMode === 'errand' && (
              <div className="mt-2">
                <FormSearchSelect value={errandId} onChange={setErrandId} options={errandOptions} placeholder={t('Search errands...', 'البحث في المعاملات...')} />
              </div>
            )}
            {linkMode === 'neither' && (
              <div className="mt-2">
                <Label className="text-body-sm">{t('Client (optional)', 'العميل (اختياري)')}</Label>
                <FormSearchSelect value={clientId} onChange={setClientId} options={clientOptions} placeholder={t('Select client...', 'اختر عميل...')} />
              </div>
            )}
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>{t('Date', 'التاريخ')} *</Label>
              <FormDatePicker
                value={date}
                onChange={d => d && setDate(d)}
                placeholder={t('Pick a date', 'اختر تاريخ')}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label>{t('Duration', 'المدة')} *</Label>
                {!isTimerStop && (
                  <button type="button" onClick={() => setTimeMode(m => m === 'duration' ? 'startend' : 'duration')} className="text-body-sm text-accent hover:underline">
                    {timeMode === 'duration' ? t('Use start/end time', 'استخدم وقت البدء/الانتهاء') : t('Use duration', 'استخدم المدة')}
                  </button>
                )}
              </div>
              {timeMode === 'duration' || isTimerStop ? (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <FormInput type="number" min={0} max={24} value={hours} onChange={e => setHours(e.target.value)} placeholder="h" disabled={isTimerStop} />
                      <span className="text-body-sm text-muted-foreground">{t('hours', 'ساعات')}</span>
                    </div>
                    <div className="flex-1">
                      <FormInput type="number" min={0} max={59} value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="m" disabled={isTimerStop} />
                      <span className="text-body-sm text-muted-foreground">{t('minutes', 'دقائق')}</span>
                    </div>
                  </div>
                  {!isTimerStop && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {QUICK_DURATIONS.map(qd => (
                        <button key={qd.label} type="button" onClick={() => { setHours(String(qd.h)); setMinutes(String(qd.m)); }}
                          className="px-2 py-1 rounded-md text-body-sm border border-border hover:bg-muted/50 transition-colors">
                          {qd.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-body-sm">{t('Start', 'بداية')}</Label>
                    <FormInput type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-body-sm">{t('End', 'نهاية')}</Label>
                    <FormInput type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                  {durationMinutes > 0 && (
                    <span className="text-body-sm text-muted-foreground whitespace-nowrap pb-1">
                      ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Billable + Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <Label>{t('Billable', 'قابل للفوترة')}</Label>
              <Switch checked={isBillable} onCheckedChange={setIsBillable} className="data-[state=checked]:bg-accent" />
            </div>
            {isBillable && (
              <div>
                <Label>{t('Rate per hour', 'سعر الساعة')}</Label>
                <FormInput type="number" min={0} value={billingRate} onChange={e => { setBillingRate(e.target.value); setRateSource(''); }} placeholder="0.00" />
                {rateSource && <span className="text-body-sm text-muted-foreground">{rateSource}</span>}
              </div>
            )}
          </div>

          {/* Calculated amount */}
          {isBillable && calculatedAmount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <Label className="text-body-sm text-muted-foreground">{t('Amount', 'المبلغ')}</Label>
              <p className="text-heading-sm text-accent font-semibold">{formatCurrency(calculatedAmount)}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving && <Loader2 size={16} className="animate-spin me-1" />}
              {saving ? t('Saving...', 'جاري الحفظ...') : isTimerStop ? t('Save Entry', 'حفظ السجل') : isEdit ? t('Update Entry', 'تحديث السجل') : t('Log Time', 'تسجيل وقت')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
