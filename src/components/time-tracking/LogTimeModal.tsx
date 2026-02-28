import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface LogTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  editEntry?: any;
}

export default function LogTimeModal({ open, onOpenChange, onSaved, editEntry }: LogTimeModalProps) {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('0');
  const [isBillable, setIsBillable] = useState(true);
  const [billingRate, setBillingRate] = useState('');
  const [caseId, setCaseId] = useState<string>('');
  const [errandId, setErrandId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [cases, setCases] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile?.organization_id) return;
    const load = async () => {
      const [casesRes, errandsRes, clientsRes] = await Promise.all([
        supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id!).not('status', 'in', '("closed","archived")').order('case_number', { ascending: false }).limit(100),
        supabase.from('errands').select('id, errand_number, title').eq('organization_id', profile.organization_id!).not('status', 'in', '("completed","cancelled")').order('errand_number', { ascending: false }).limit(100),
        supabase.from('clients').select('id, first_name, last_name, company_name, client_type').eq('organization_id', profile.organization_id!).eq('status', 'active').order('created_at', { ascending: false }).limit(100),
      ]);
      setCases(casesRes.data || []);
      setErrands(errandsRes.data || []);
      setClients(clientsRes.data || []);
    };
    load();
  }, [open, profile?.organization_id]);

  useEffect(() => {
    if (editEntry) {
      setDescription(editEntry.description || '');
      setDate(editEntry.date || new Date().toISOString().split('T')[0]);
      const h = Math.floor((editEntry.duration_minutes || 60) / 60);
      const m = (editEntry.duration_minutes || 60) % 60;
      setHours(String(h));
      setMinutes(String(m));
      setIsBillable(editEntry.is_billable ?? true);
      setBillingRate(editEntry.billing_rate ? String(editEntry.billing_rate) : '');
      setCaseId(editEntry.case_id || '');
      setErrandId(editEntry.errand_id || '');
      setClientId(editEntry.client_id || '');
    } else {
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setHours('1');
      setMinutes('0');
      setIsBillable(true);
      setBillingRate('');
      setCaseId('');
      setErrandId('');
      setClientId('');
    }
  }, [editEntry, open]);

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error(t('Description is required', 'الوصف مطلوب'));
      return;
    }
    const durationMinutes = parseInt(hours || '0') * 60 + parseInt(minutes || '0');
    if (durationMinutes <= 0) {
      toast.error(t('Duration must be greater than 0', 'المدة يجب أن تكون أكبر من 0'));
      return;
    }
    setSaving(true);
    const payload: any = {
      description,
      date,
      duration_minutes: durationMinutes,
      is_billable: isBillable,
      billing_rate: isBillable && billingRate ? parseFloat(billingRate) : null,
      case_id: caseId || null,
      errand_id: errandId || null,
      client_id: clientId || null,
    };

    let error;
    if (editEntry) {
      ({ error } = await supabase.from('time_entries').update(payload).eq('id', editEntry.id));
    } else {
      payload.organization_id = profile!.organization_id;
      payload.user_id = user!.id;
      ({ error } = await supabase.from('time_entries').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editEntry ? t('Time entry updated', 'تم تحديث سجل الوقت') : t('Time entry logged', 'تم تسجيل الوقت'));
      onOpenChange(false);
      onSaved?.();
    }
  };

  const getClientName = (c: any) => c.client_type === 'company' ? c.company_name : `${c.first_name} ${c.last_name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editEntry ? t('Edit Time Entry', 'تعديل سجل الوقت') : t('Log Time', 'تسجيل وقت')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('Description', 'الوصف')} *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('What did you work on?', 'ما الذي عملت عليه؟')} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('Date', 'التاريخ')}</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{t('Duration', 'المدة')}</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <Input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="h" />
                  <span className="text-body-sm text-muted-foreground">{t('hours', 'ساعات')}</span>
                </div>
                <div className="flex-1">
                  <Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="m" />
                  <span className="text-body-sm text-muted-foreground">{t('minutes', 'دقائق')}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label>{t('Case', 'القضية')}</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={t('Select case...', 'اختر قضية...')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('None', 'بدون')}</SelectItem>
                {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('Errand', 'المعاملة')}</Label>
            <Select value={errandId} onValueChange={setErrandId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={t('Select errand...', 'اختر معاملة...')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('None', 'بدون')}</SelectItem>
                {errands.map(e => <SelectItem key={e.id} value={e.id}>{e.errand_number} - {e.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('Client', 'العميل')}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={t('Select client...', 'اختر عميل...')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('None', 'بدون')}</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{getClientName(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('Billable', 'قابل للفوترة')}</Label>
            <Switch checked={isBillable} onCheckedChange={setIsBillable} />
          </div>
          {isBillable && (
            <div>
              <Label>{t('Rate (per hour)', 'السعر (بالساعة)')}</Label>
              <Input type="number" min="0" value={billingRate} onChange={e => setBillingRate(e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent-dark">
              {saving ? t('Saving...', 'جاري الحفظ...') : editEntry ? t('Update', 'تحديث') : t('Log Time', 'تسجيل وقت')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
