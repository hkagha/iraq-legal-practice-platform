import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { GovernorateSelect } from '@/components/ui/GovernorateSelect';
import { CountrySelect } from '@/components/ui/CountrySelect';
import type { EntityRow, PartyRef } from '@/types/parties';
import { resolveEntityName } from '@/lib/parties';

const Schema = z.object({
  company_name: z.string().min(1, 'Required'),
  company_name_ar: z.string().optional().nullable(),
  company_type: z.string().optional().nullable(),
  company_registration_number: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  industry_ar: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  city_ar: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  address_ar: z.string().optional().nullable(),
  payment_terms_days: z.coerce.number().int().min(0).max(365).optional().nullable(),
  preferred_currency: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  notes_ar: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof Schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entity?: EntityRow | null;
  onSaved?: (ref: PartyRef, row: EntityRow) => void;
}

export default function EntityFormSlideOver({ isOpen, onClose, entity, onSaved }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!entity;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      company_name: '', company_name_ar: '', company_type: '', company_registration_number: '',
      tax_id: '', industry: '', industry_ar: '', email: '', phone: '', website: '',
      country: 'IQ', governorate: '', city: '', city_ar: '', address: '', address_ar: '',
      payment_terms_days: 30, preferred_currency: 'IQD', notes: '', notes_ar: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (entity) {
      reset({
        company_name: entity.company_name,
        company_name_ar: entity.company_name_ar || '',
        company_type: entity.company_type || '',
        company_registration_number: entity.company_registration_number || '',
        tax_id: entity.tax_id || '',
        industry: entity.industry || '',
        industry_ar: entity.industry_ar || '',
        email: entity.email || '',
        phone: entity.phone || '',
        website: entity.website || '',
        country: entity.country || 'IQ',
        governorate: entity.governorate || '',
        city: entity.city || '',
        city_ar: entity.city_ar || '',
        address: entity.address || '',
        address_ar: entity.address_ar || '',
        payment_terms_days: entity.payment_terms_days ?? 30,
        preferred_currency: entity.preferred_currency || 'IQD',
        notes: entity.notes || '',
        notes_ar: entity.notes_ar || '',
      });
    } else {
      reset();
    }
  }, [isOpen, entity, reset]);

  const phoneVal = watch('phone');

  const onSubmit = async (values: FormValues) => {
    if (!profile?.organization_id) return;
    setSubmitting(true);
    try {
      const payload: any = {
        ...values,
        email: values.email || null,
        organization_id: profile.organization_id,
        updated_by: profile.id,
      };
      let saved: EntityRow | null = null;
      if (isEdit && entity) {
        const { data, error } = await supabase.from('entities').update(payload).eq('id', entity.id).select().single();
        if (error) throw error;
        saved = data as EntityRow;
        toast.success(language === 'ar' ? 'تم تحديث الشركة' : 'Company updated');
      } else {
        payload.created_by = profile.id;
        const { data, error } = await supabase.from('entities').insert(payload).select().single();
        if (error) throw error;
        saved = data as EntityRow;
        toast.success(language === 'ar' ? 'تم إنشاء الشركة' : 'Company created');
      }
      qc.invalidateQueries({ queryKey: ['parties'] });
      qc.invalidateQueries({ queryKey: ['entity', saved!.id] });
      onSaved?.(
        { partyType: 'entity', personId: null, entityId: saved!.id, displayName: resolveEntityName(saved!, language as 'en' | 'ar') },
        saved!,
      );
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Company' : 'New Company'}
      titleAr={isEdit ? 'تعديل شركة' : 'شركة جديدة'}
      width="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? (language === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : language === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company name" labelAr="اسم الشركة" required error={!!errors.company_name}>
            <FormInput {...register('company_name')} dir="ltr" />
          </Field>
          <Field label="Company name (Arabic)" labelAr="اسم الشركة (عربي)">
            <FormInput {...register('company_name_ar')} dir="rtl" />
          </Field>
          <Field label="Company type" labelAr="نوع الشركة">
            <FormSelect
              value={watch('company_type') || ''}
              onValueChange={(v) => setValue('company_type', v)}
              placeholder={language === 'ar' ? 'اختر' : 'Select'}
              options={[
                { value: 'llc', label: language === 'ar' ? 'محدودة المسؤولية' : 'LLC' },
                { value: 'jsc', label: language === 'ar' ? 'مساهمة' : 'Joint Stock' },
                { value: 'sole_proprietorship', label: language === 'ar' ? 'فردية' : 'Sole Proprietorship' },
                { value: 'partnership', label: language === 'ar' ? 'تضامن' : 'Partnership' },
                { value: 'branch', label: language === 'ar' ? 'فرع شركة أجنبية' : 'Foreign Branch' },
                { value: 'government', label: language === 'ar' ? 'حكومية' : 'Government' },
                { value: 'ngo', label: language === 'ar' ? 'منظمة' : 'NGO' },
              ]}
            />
          </Field>
          <Field label="Industry" labelAr="القطاع">
            <FormInput {...register('industry')} dir="ltr" />
          </Field>
          <Field label="Registration number" labelAr="رقم التسجيل">
            <FormInput {...register('company_registration_number')} dir="ltr" />
          </Field>
          <Field label="Tax ID" labelAr="الرقم الضريبي">
            <FormInput {...register('tax_id')} dir="ltr" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" labelAr="البريد الإلكتروني" error={!!errors.email}>
            <FormInput type="email" {...register('email')} dir="ltr" />
          </Field>
          <Field label="Website" labelAr="الموقع الإلكتروني">
            <FormInput {...register('website')} dir="ltr" placeholder="https://" />
          </Field>
          <Field label="Phone" labelAr="الهاتف">
            <PhoneInput value={phoneVal || ''} onChange={(v) => setValue('phone', v)} />
          </Field>
          <Field label="Industry (Arabic)" labelAr="القطاع (عربي)">
            <FormInput {...register('industry_ar')} dir="rtl" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" labelAr="الدولة">
            <CountrySelect value={watch('country') || 'IQ'} onChange={(v) => setValue('country', v)} />
          </Field>
          <Field label="Governorate" labelAr="المحافظة">
            <GovernorateSelect value={watch('governorate') || ''} onChange={(v) => setValue('governorate', v)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" labelAr="المدينة">
            <FormInput {...register('city')} dir="ltr" />
          </Field>
          <Field label="City (Arabic)" labelAr="المدينة (عربي)">
            <FormInput {...register('city_ar')} dir="rtl" />
          </Field>
          <Field label="Address" labelAr="العنوان">
            <FormInput {...register('address')} dir="ltr" />
          </Field>
          <Field label="Address (Arabic)" labelAr="العنوان (عربي)">
            <FormInput {...register('address_ar')} dir="rtl" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment terms (days)" labelAr="شروط الدفع (أيام)">
            <FormInput type="number" {...register('payment_terms_days')} dir="ltr" />
          </Field>
          <Field label="Preferred currency" labelAr="العملة المفضلة">
            <FormSelect
              value={watch('preferred_currency') || 'IQD'}
              onValueChange={(v) => setValue('preferred_currency', v)}
              options={[
                { value: 'IQD', label: 'IQD — د.ع' },
                { value: 'USD', label: 'USD — $' },
                { value: 'EUR', label: 'EUR — €' },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Notes" labelAr="ملاحظات">
            <FormTextarea rows={3} {...register('notes')} dir="ltr" />
          </Field>
          <Field label="Notes (Arabic)" labelAr="ملاحظات (عربي)">
            <FormTextarea rows={3} {...register('notes_ar')} dir="rtl" />
          </Field>
        </div>
      </form>
    </SlideOver>
  );
}

function Field({
  label, labelAr, required, error, children,
}: { label: string; labelAr: string; required?: boolean; error?: boolean; children: React.ReactNode }) {
  const { language } = useLanguage();
  return (
    <label className="block">
      <span className="text-label text-muted-foreground mb-1.5 block">
        {language === 'ar' ? labelAr : label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </span>
      {children}
      {error && <span className="text-[11px] text-destructive mt-1 block">{language === 'ar' ? 'حقل مطلوب' : 'Required'}</span>}
    </label>
  );
}
