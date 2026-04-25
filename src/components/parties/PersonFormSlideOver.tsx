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
import { CitySelect } from '@/components/ui/CitySelect';
import type { PersonRow, PartyRef } from '@/types/parties';
import { resolvePersonName } from '@/lib/parties';

const Schema = z.object({
  first_name: z.string().min(1, 'Required'),
  first_name_ar: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  last_name_ar: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  whatsapp_number: z.string().optional().nullable(),
  national_id_number: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  city_ar: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  address_ar: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  notes_ar: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof Schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, edits this person; otherwise creates a new one. */
  person?: PersonRow | null;
  onSaved?: (ref: PartyRef, row: PersonRow) => void;
}

export default function PersonFormSlideOver({ isOpen, onClose, person, onSaved }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!person;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      first_name: '', first_name_ar: '', last_name: '', last_name_ar: '',
      email: '', phone: '', whatsapp_number: '', national_id_number: '',
      gender: '', nationality: 'IQ', country: 'IQ',
      governorate: '', city: '', city_ar: '', address: '', address_ar: '',
      notes: '', notes_ar: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (person) {
        reset({
          first_name: person.first_name || '',
          first_name_ar: person.first_name_ar || '',
          last_name: person.last_name || '',
          last_name_ar: person.last_name_ar || '',
          email: person.email || '',
          phone: person.phone || '',
          whatsapp_number: person.whatsapp_number || '',
          national_id_number: person.national_id_number || '',
          gender: person.gender || '',
          nationality: person.nationality || 'IQ',
          country: person.country || 'IQ',
          governorate: person.governorate || '',
          city: person.city || '',
          city_ar: person.city_ar || '',
          address: person.address || '',
          address_ar: person.address_ar || '',
          notes: person.notes || '',
          notes_ar: person.notes_ar || '',
        });
      } else {
        reset();
      }
    }
  }, [isOpen, person, reset]);

  const phoneVal = watch('phone');
  const whatsappVal = watch('whatsapp_number');

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
      let saved: PersonRow | null = null;
      if (isEdit && person) {
        const { data, error } = await supabase.from('persons').update(payload).eq('id', person.id).select().single();
        if (error) throw error;
        saved = data as PersonRow;
        toast.success(language === 'ar' ? 'تم تحديث الشخص' : 'Person updated');
      } else {
        payload.created_by = profile.id;
        const { data, error } = await supabase.from('persons').insert(payload).select().single();
        if (error) throw error;
        saved = data as PersonRow;
        toast.success(language === 'ar' ? 'تم إنشاء الشخص' : 'Person created');
      }
      qc.invalidateQueries({ queryKey: ['parties'] });
      qc.invalidateQueries({ queryKey: ['person', saved!.id] });
      onSaved?.(
        { partyType: 'person', personId: saved!.id, entityId: null, displayName: resolvePersonName(saved!, language as 'en' | 'ar') },
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
      title={isEdit ? 'Edit Person' : 'New Person'}
      titleAr={isEdit ? 'تعديل شخص' : 'شخص جديد'}
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
        {/* Names */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" labelAr="الاسم الأول" required error={!!errors.first_name}>
            <FormInput {...register('first_name')} dir="ltr" />
          </Field>
          <Field label="First name (Arabic)" labelAr="الاسم الأول (عربي)">
            <FormInput {...register('first_name_ar')} dir="rtl" />
          </Field>
          <Field label="Last name" labelAr="اسم العائلة">
            <FormInput {...register('last_name')} dir="ltr" />
          </Field>
          <Field label="Last name (Arabic)" labelAr="اسم العائلة (عربي)">
            <FormInput {...register('last_name_ar')} dir="rtl" />
          </Field>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" labelAr="البريد الإلكتروني" error={!!errors.email}>
            <FormInput type="email" {...register('email')} dir="ltr" />
          </Field>
          <Field label="National ID" labelAr="الرقم الوطني">
            <FormInput {...register('national_id_number')} dir="ltr" />
          </Field>
          <Field label="Phone" labelAr="الهاتف">
            <PhoneInput value={phoneVal || ''} onChange={(v) => setValue('phone', v)} />
          </Field>
          <Field label="WhatsApp" labelAr="واتساب">
            <PhoneInput value={whatsappVal || ''} onChange={(v) => setValue('whatsapp_number', v)} />
          </Field>
        </div>

        {/* Demographics */}
        <Field label="Gender" labelAr="الجنس">
          <FormSelect
            value={watch('gender') || ''}
            onValueChange={(v) => setValue('gender', v)}
            placeholder={language === 'ar' ? 'اختر' : 'Select'}
            options={[
              { value: 'male', label: language === 'ar' ? 'ذكر' : 'Male' },
              { value: 'female', label: language === 'ar' ? 'أنثى' : 'Female' },
            ]}
          />
        </Field>

        {/* Address */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" labelAr="الدولة">
            <CountrySelect value={watch('country') || 'IQ'} onChange={(v) => setValue('country', v)} />
          </Field>
          <Field label="Nationality" labelAr="الجنسية">
            <CountrySelect value={watch('nationality') || 'IQ'} onChange={(v) => setValue('nationality', v)} />
          </Field>
        </div>
        {/* Governorate is Iraq-only — it is the legal taxonomy of Iraqi addresses. */}
        {(watch('country') || 'IQ') === 'IQ' && (
          <Field label="Governorate" labelAr="المحافظة">
            <GovernorateSelect value={watch('governorate') || ''} onChange={(v) => setValue('governorate', v)} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" labelAr="المدينة">
            <CitySelect
              value={watch('city') || ''}
              onChange={(v) => setValue('city', v)}
              countryCode={watch('country') || 'IQ'}
              governorateCode={watch('governorate') || undefined}
            />
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

        {/* Notes */}
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
