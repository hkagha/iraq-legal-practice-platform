import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { CitySelect } from '@/components/ui/CitySelect';
import { findGovernorate, IRAQ_GOVERNORATE_LEGACY_NAMES } from '@/lib/referenceData';
import { GovernorateSelect } from '@/components/ui/GovernorateSelect';
import { CountrySelect } from '@/components/ui/CountrySelect';

const governorates = IRAQ_GOVERNORATE_LEGACY_NAMES;

const orgTypes = [
  { value: 'law_firm', label: 'Law Firm', labelAr: 'مكتب محاماة' },
  { value: 'legal_department', label: 'Legal Department', labelAr: 'إدارة قانونية' },
  { value: 'solo_practice', label: 'Solo Practice', labelAr: 'ممارسة فردية' },
  { value: 'consultancy', label: 'Consultancy', labelAr: 'استشارات' },
];

const industryOptions = [
  { value: 'general_practice', label: 'General Practice', labelAr: 'ممارسة عامة' },
  { value: 'corporate', label: 'Corporate', labelAr: 'شركات' },
  { value: 'litigation', label: 'Litigation', labelAr: 'تقاضي' },
  { value: 'criminal', label: 'Criminal', labelAr: 'جنائي' },
  { value: 'family', label: 'Family', labelAr: 'أحوال شخصية' },
  { value: 'real_estate', label: 'Real Estate', labelAr: 'عقارات' },
  { value: 'ip', label: 'Intellectual Property', labelAr: 'ملكية فكرية' },
  { value: 'tax', label: 'Tax', labelAr: 'ضرائب' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

export default function GeneralSettings() {
  const { language, t } = useLanguage();
  const { organization } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', name_ar: '', org_type: 'law_firm', industry_focus: 'general_practice',
    phone: '', email: '', address: '', city: '', governorate: 'Baghdad',
    website: '', tax_id: '',
  });

  useEffect(() => {
    if (!organization?.id) return;
    supabase.from('organizations').select('*').eq('id', organization.id).single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: (data as any).name || '',
            name_ar: (data as any).name_ar || '',
            org_type: (data as any).org_type || 'law_firm',
            industry_focus: (data as any).industry_focus || 'general_practice',
            phone: (data as any).phone || '',
            email: (data as any).email || '',
            address: (data as any).address || '',
            city: (data as any).city || '',
            governorate: (data as any).governorate || 'Baghdad',
            website: (data as any).website || '',
            tax_id: (data as any).tax_id || '',
          });
        }
      });
  }, [organization?.id]);

  const handleSave = async () => {
    if (!organization?.id) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({
      name: form.name,
      name_ar: form.name_ar,
      org_type: form.org_type,
      industry_focus: form.industry_focus,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      governorate: form.governorate,
      website: form.website,
      tax_id: form.tax_id,
    } as any).eq('id', organization.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.saved'));
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <h2 className="text-heading-lg text-foreground">{t('settings.sections.general')}</h2>

      <FormField label={t('settings.org.name')} required>
        <FormInput value={form.name} onChange={e => update('name', e.target.value)} />
      </FormField>

      <FormField label={t('settings.org.nameAr')}>
        <FormInput value={form.name_ar} onChange={e => update('name_ar', e.target.value)} dir="rtl" />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('settings.org.type')}>
          <FormSelect
            value={form.org_type}
            onValueChange={v => update('org_type', v)}
            options={orgTypes.map(o => ({ value: o.value, label: language === 'ar' ? o.labelAr : o.label }))}
          />
        </FormField>
        <FormField label={t('settings.org.industryFocus')}>
          <FormSelect
            value={form.industry_focus}
            onValueChange={v => update('industry_focus', v)}
            options={industryOptions.map(o => ({ value: o.value, label: language === 'ar' ? o.labelAr : o.label }))}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('settings.org.phone')}>
          <PhoneInput value={form.phone} onChange={v => update('phone', v)} />
        </FormField>
        <FormField label={t('settings.org.email')}>
          <FormInput type="email" value={form.email} onChange={e => update('email', e.target.value)} />
        </FormField>
      </div>

      <FormField label={t('settings.org.address')}>
        <FormTextarea value={form.address} onChange={e => update('address', e.target.value)} className="min-h-[60px]" />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('settings.org.city')}>
          <CitySelect
            value={form.city}
            onChange={v => update('city', v)}
            governorateCode={findGovernorate(form.governorate)?.code}
          />
        </FormField>
        <FormField label={t('settings.org.governorate')}>
          <GovernorateSelect
            value={form.governorate}
            onChange={v => update('governorate', v)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('settings.org.country')}>
          <CountrySelect value="IQ" onChange={() => {}} disabled />
        </FormField>
        <FormField label={t('settings.org.website')}>
          <FormInput value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://" />
        </FormField>
      </div>

      <FormField label={t('settings.org.taxId')}>
        <FormInput value={form.tax_id} onChange={e => update('tax_id', e.target.value)} />
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
