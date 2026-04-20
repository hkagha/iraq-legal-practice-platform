import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const allDays = [
  { value: 'sunday', en: 'Sunday', ar: 'الأحد' },
  { value: 'monday', en: 'Monday', ar: 'الاثنين' },
  { value: 'tuesday', en: 'Tuesday', ar: 'الثلاثاء' },
  { value: 'wednesday', en: 'Wednesday', ar: 'الأربعاء' },
  { value: 'thursday', en: 'Thursday', ar: 'الخميس' },
  { value: 'friday', en: 'Friday', ar: 'الجمعة' },
  { value: 'saturday', en: 'Saturday', ar: 'السبت' },
];

export default function BillingConfigSettings() {
  const { language, t } = useLanguage();
  const { organization } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    default_hourly_rate: 0,
    default_currency: 'IQD',
    default_payment_terms_days: 30,
    default_tax_rate: 0,
    working_days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    working_hours_start: '08:00',
    working_hours_end: '16:00',
  });

  useEffect(() => {
    if (!organization?.id) return;
    supabase.from('organizations').select('*').eq('id', organization.id).single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setForm({
          default_hourly_rate: d.default_hourly_rate || 0,
          default_currency: d.default_currency || 'IQD',
          default_payment_terms_days: d.default_payment_terms_days || 30,
          default_tax_rate: d.default_tax_rate || 0,
          working_days: d.working_days || ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
          working_hours_start: d.working_hours_start?.slice(0, 5) || '08:00',
          working_hours_end: d.working_hours_end?.slice(0, 5) || '16:00',
        });
      });
  }, [organization?.id]);

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter(d => d !== day)
        : [...f.working_days, day],
    }));
  };

  const handleSave = async () => {
    if (!organization?.id) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({
      default_hourly_rate: form.default_hourly_rate,
      default_currency: form.default_currency,
      default_payment_terms_days: form.default_payment_terms_days,
      default_tax_rate: form.default_tax_rate,
      working_days: form.working_days,
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
    } as any).eq('id', organization.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.saved'));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-heading-lg text-foreground">{t('settings.sections.billingConfig')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('settings.billingConfig.defaultRate')}
          helperText={language === 'ar' ? 'يُستخدم عند عدم تحديد سعر للقضية أو المستخدم' : 'Used when no case-specific or user-specific rate is set'}>
          <FormInput
            type="number"
            value={form.default_hourly_rate}
            onChange={e => setForm(f => ({ ...f, default_hourly_rate: Number(e.target.value) }))}
          />
        </FormField>
        <FormField label={t('settings.billingConfig.defaultCurrency')}>
          <CurrencySelect
            value={form.default_currency}
            onChange={v => setForm(f => ({ ...f, default_currency: v }))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('settings.billingConfig.paymentTerms')}
          helperText={language === 'ar' ? 'سيتم تحديد تاريخ الاستحقاق بعد هذا العدد من الأيام' : 'Due date will be set to this many days after issue date'}>
          <FormInput
            type="number"
            value={form.default_payment_terms_days}
            onChange={e => setForm(f => ({ ...f, default_payment_terms_days: Number(e.target.value) }))}
          />
        </FormField>
        <FormField label={t('settings.billingConfig.taxRate')}
          helperText={language === 'ar' ? 'تُطبق تلقائياً على الفواتير الجديدة' : 'Applied automatically to new invoices'}>
          <div className="relative">
            <FormInput
              type="number"
              value={form.default_tax_rate}
              onChange={e => setForm(f => ({ ...f, default_tax_rate: Number(e.target.value) }))}
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-body-md">%</span>
          </div>
        </FormField>
      </div>

      {/* Working Days */}
      <FormField label={t('settings.billingConfig.workingDays')}
        helperText={language === 'ar' ? 'تُستخدم لحساب الاستخدام وعرض التقويم' : 'Used for utilization calculations and calendar display'}>
        <div className="flex flex-wrap gap-3 mt-1">
          {allDays.map(day => (
            <label key={day.value} className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={form.working_days.includes(day.value)}
                onCheckedChange={() => toggleDay(day.value)}
              />
              <span className="text-body-md">{language === 'ar' ? day.ar : day.en}</span>
            </label>
          ))}
        </div>
      </FormField>

      {/* Working Hours */}
      <FormField label={t('settings.billingConfig.workingHours')}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-body-sm text-muted-foreground mb-1 block">{t('settings.billingConfig.startTime')}</label>
            <FormInput
              type="time"
              value={form.working_hours_start}
              onChange={e => setForm(f => ({ ...f, working_hours_start: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-body-sm text-muted-foreground mb-1 block">{t('settings.billingConfig.endTime')}</label>
            <FormInput
              type="time"
              value={form.working_hours_end}
              onChange={e => setForm(f => ({ ...f, working_hours_end: e.target.value }))}
            />
          </div>
        </div>
      </FormField>

      <div className="pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="h-10 bg-accent text-accent-foreground hover:bg-accent-dark">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );
}
