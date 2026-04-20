import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SlideOver } from '@/components/ui/SlideOver';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  User, Building2, ChevronDown, ChevronUp, Plus, X,
  MoreHorizontal, Pencil, Trash2, Loader2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { CitySelect } from '@/components/ui/CitySelect';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { findGovernorate } from '@/lib/referenceData';

const GOVERNORATES = [
  'Baghdad', 'Basra', 'Maysan', 'Dhi Qar', 'Wasit', 'Babil', 'Karbala', 'Najaf',
  'Al-Qadisiyyah', 'Al-Muthanna', 'Diyala', 'Salah al-Din', 'Kirkuk', 'Nineveh',
  'Erbil', 'Duhok', 'Sulaymaniyah', 'Al-Anbar',
];

interface ContactPerson {
  id?: string;
  first_name: string;
  last_name: string;
  first_name_ar: string;
  last_name_ar: string;
  email: string;
  phone: string;
  job_title: string;
  job_title_ar: string;
  department: string;
  department_ar: string;
  is_primary: boolean;
}

interface FormData {
  client_type: 'individual' | 'company';
  first_name: string;
  last_name: string;
  first_name_ar: string;
  last_name_ar: string;
  national_id_number: string;
  date_of_birth: Date | undefined;
  gender: string;
  nationality: string;
  company_name: string;
  company_name_ar: string;
  company_type: string;
  company_registration_number: string;
  industry: string;
  tax_id: string;
  email: string;
  phone: string;
  secondary_phone: string;
  whatsapp_number: string;
  address: string;
  address_ar: string;
  city: string;
  governorate: string;
  source: string;
  status: string;
  tags: string[];
  notes: string;
}

const emptyForm: FormData = {
  client_type: 'individual',
  first_name: '', last_name: '', first_name_ar: '', last_name_ar: '',
  national_id_number: '', date_of_birth: undefined, gender: '', nationality: 'Iraqi',
  company_name: '', company_name_ar: '', company_type: '', company_registration_number: '',
  industry: '', tax_id: '',
  email: '', phone: '', secondary_phone: '', whatsapp_number: '',
  address: '', address_ar: '', city: '', governorate: 'Baghdad',
  source: '', status: 'active', tags: [], notes: '',
};

const emptyContact: ContactPerson = {
  first_name: '', last_name: '', first_name_ar: '', last_name_ar: '',
  email: '', phone: '', job_title: '', job_title_ar: '',
  department: '', department_ar: '', is_primary: false,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editClientId?: string | null;
}

export default function ClientFormSlideOver({ isOpen, onClose, onSaved, editClientId }: Props) {
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();

  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Collapsible sections
  const [sections, setSections] = useState({ info: true, contact: true, address: true, contacts: true, additional: true });
  const toggleSection = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }));

  // Contact person inline form
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactPerson>({ ...emptyContact });

  // Tag input
  const [tagInput, setTagInput] = useState('');

  const initialFormRef = useRef<string>('');

  const isEdit = !!editClientId;

  // Reset form when opening
  useEffect(() => {
    if (!isOpen) return;
    if (editClientId) {
      loadClient(editClientId);
    } else {
      const fresh = { ...emptyForm };
      setForm(fresh);
      setContacts([]);
      setErrors({});
      setIsDirty(false);
      initialFormRef.current = JSON.stringify(fresh);
    }
  }, [isOpen, editClientId]);

  const loadClient = async (id: string) => {
    setIsLoadingEdit(true);
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      const c = client as any;
      const loaded: FormData = {
        client_type: c.client_type,
        first_name: c.first_name || '', last_name: c.last_name || '',
        first_name_ar: c.first_name_ar || '', last_name_ar: c.last_name_ar || '',
        national_id_number: c.national_id_number || '',
        date_of_birth: c.date_of_birth ? new Date(c.date_of_birth) : undefined,
        gender: c.gender || '', nationality: c.nationality || 'Iraqi',
        company_name: c.company_name || '', company_name_ar: c.company_name_ar || '',
        company_type: c.company_type || '', company_registration_number: c.company_registration_number || '',
        industry: c.industry || '', tax_id: c.tax_id || '',
        email: c.email || '',
        phone: c.phone || '',
        secondary_phone: c.secondary_phone || '', whatsapp_number: c.whatsapp_number || '',
        address: c.address || '', address_ar: c.address_ar || '',
        city: c.city || '', governorate: c.governorate || 'Baghdad',
        source: c.source || '', status: c.status || 'active',
        tags: c.tags || [], notes: c.notes || '',
      };
      setForm(loaded);
      initialFormRef.current = JSON.stringify(loaded);
      setIsDirty(false);

      // Load contacts
      const { data: contactsData } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', id)
        .order('is_primary', { ascending: false });
      if (contactsData) {
        setContacts(contactsData.map((cc: any) => ({
          id: cc.id,
          first_name: cc.first_name, last_name: cc.last_name,
          first_name_ar: cc.first_name_ar || '', last_name_ar: cc.last_name_ar || '',
          email: cc.email || '', phone: cc.phone || '',
          job_title: cc.job_title || '', job_title_ar: cc.job_title_ar || '',
          department: cc.department || '', department_ar: cc.department_ar || '',
          is_primary: cc.is_primary,
        })));
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.client_type === 'individual') {
      if (!form.first_name.trim()) errs.first_name = t('clients.form.firstNameRequired');
      if (!form.last_name.trim()) errs.last_name = t('clients.form.lastNameRequired');
    } else {
      if (!form.company_name.trim()) errs.company_name = t('clients.form.companyNameRequired');
      if (!form.company_type) errs.company_type = t('clients.form.companyTypeRequired');
    }
    if (!form.phone.trim()) errs.phone = t('clients.form.phoneRequired');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('clients.form.invalidEmail');
    if (!form.governorate) errs.governorate = t('clients.form.governorateRequired');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({ title: t('clients.messages.validationError'), variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        client_type: form.client_type,
        email: form.email || null,
        phone: form.phone || null,
        secondary_phone: form.secondary_phone || null,
        whatsapp_number: form.whatsapp_number || null,
        address: form.address || null, address_ar: form.address_ar || null,
        city: form.city || null,
        governorate: form.governorate,
        source: form.source || null, status: form.status,
        tags: form.tags, notes: form.notes || null,
        tax_id: form.tax_id || null,
      };

      if (form.client_type === 'individual') {
        payload.first_name = form.first_name;
        payload.last_name = form.last_name;
        payload.first_name_ar = form.first_name_ar || null;
        payload.last_name_ar = form.last_name_ar || null;
        payload.national_id_number = form.national_id_number || null;
        payload.date_of_birth = form.date_of_birth ? form.date_of_birth.toISOString().split('T')[0] : null;
        payload.gender = form.gender || null;
        payload.nationality = form.nationality || null;
        // Clear company fields
        payload.company_name = null; payload.company_name_ar = null;
        payload.company_type = null; payload.company_registration_number = null;
        payload.industry = null;
      } else {
        payload.company_name = form.company_name;
        payload.company_name_ar = form.company_name_ar || null;
        payload.company_type = form.company_type;
        payload.company_registration_number = form.company_registration_number || null;
        payload.industry = form.industry || null;
        // Clear individual fields
        payload.first_name = null; payload.last_name = null;
        payload.first_name_ar = null; payload.last_name_ar = null;
        payload.national_id_number = null; payload.date_of_birth = null;
        payload.gender = null; payload.nationality = null;
      }

      let clientId = editClientId;

      if (isEdit) {
        payload.updated_by = profile?.id;
        const { error } = await supabase.from('clients').update(payload as any).eq('id', editClientId!);
        if (error) throw error;
      } else {
        payload.organization_id = profile?.organization_id;
        payload.created_by = profile?.id;
        payload.updated_by = profile?.id;
        const { data, error } = await supabase.from('clients').insert(payload as any).select('id').single();
        if (error) throw error;
        clientId = data.id;
      }

      // Handle contacts for company clients
      if (form.client_type === 'company' && clientId) {
        if (isEdit) {
          // Delete removed contacts
          const existingIds = contacts.filter(c => c.id).map(c => c.id!);
          if (existingIds.length > 0) {
            await supabase.from('client_contacts').delete()
              .eq('client_id', clientId)
              .not('id', 'in', `(${existingIds.join(',')})`);
          } else {
            await supabase.from('client_contacts').delete().eq('client_id', clientId);
          }
          // Upsert contacts
          for (const c of contacts) {
            const contactPayload = {
              client_id: clientId,
              organization_id: profile?.organization_id!,
              first_name: c.first_name, last_name: c.last_name,
              first_name_ar: c.first_name_ar || null, last_name_ar: c.last_name_ar || null,
              email: c.email || null, phone: c.phone || null,
              job_title: c.job_title || null, job_title_ar: c.job_title_ar || null,
              department: c.department || null, department_ar: c.department_ar || null,
              is_primary: c.is_primary,
            };
            if (c.id) {
              await supabase.from('client_contacts').update(contactPayload as any).eq('id', c.id);
            } else {
              await supabase.from('client_contacts').insert(contactPayload as any);
            }
          }
        } else {
          // Create new contacts
          if (contacts.length > 0) {
            await supabase.from('client_contacts').insert(
              contacts.map(c => ({
                client_id: clientId!,
                organization_id: profile?.organization_id!,
                first_name: c.first_name, last_name: c.last_name,
                first_name_ar: c.first_name_ar || null, last_name_ar: c.last_name_ar || null,
                email: c.email || null, phone: c.phone || null,
                job_title: c.job_title || null, job_title_ar: c.job_title_ar || null,
                department: c.department || null, department_ar: c.department_ar || null,
                is_primary: c.is_primary,
              })) as any
            );
          }
        }
      }

      // Log activity
      if (clientId && profile?.organization_id) {
        await supabase.from('client_activities').insert({
          organization_id: profile.organization_id,
          client_id: clientId,
          actor_id: profile.id,
          activity_type: isEdit ? 'client_updated' : 'client_created',
          title: isEdit ? 'Updated client information' : 'Created new client',
          title_ar: isEdit ? 'تم تحديث معلومات العميل' : 'تم إنشاء عميل جديد',
        } as any);
      }

      toast({ title: isEdit ? t('clients.messages.updated') : t('clients.messages.created') });
      setIsDirty(false);
      onSaved();
      onClose();
    } catch (err: any) {
      toast({
        title: isEdit ? t('clients.form.failedUpdate') : t('clients.form.failedCreate'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  // Tag helpers
  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      updateField('tags', [...form.tags, trimmed]);
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => updateField('tags', form.tags.filter(t => t !== tag));

  // Contact person helpers
  const saveContactPerson = () => {
    if (!contactForm.first_name.trim() || !contactForm.last_name.trim()) return;
    if (editingContactIdx !== null) {
      setContacts(cs => cs.map((c, i) => i === editingContactIdx ? { ...contactForm, id: c.id } : c));
    } else {
      setContacts(cs => [...cs, { ...contactForm }]);
    }
    setContactForm({ ...emptyContact });
    setShowContactForm(false);
    setEditingContactIdx(null);
    setIsDirty(true);
  };

  const removeContact = (idx: number) => {
    setContacts(cs => cs.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const setPrimaryContact = (idx: number) => {
    setContacts(cs => cs.map((c, i) => ({ ...c, is_primary: i === idx })));
    setIsDirty(true);
  };

  const editContact = (idx: number) => {
    setContactForm({ ...contacts[idx] });
    setEditingContactIdx(idx);
    setShowContactForm(true);
  };

  const suggestedTags = language === 'ar'
    ? ['مهم', 'شركات', 'حكومي', 'متكرر']
    : ['VIP', 'Corporate', 'Government', 'Recurring'];

  const companyTypeOptions = [
    'llc', 'jsc', 'sole_proprietorship', 'partnership',
    'branch_office', 'representative_office', 'ngo', 'government', 'other',
  ].map(k => ({ value: k, label: t(`clients.companyTypes.${k}`) }));

  const sourceOptions = [
    'referral', 'walk_in', 'website', 'social_media', 'advertisement', 'other',
  ].map(k => ({ value: k, label: t(`clients.sources.${k}`) }));

  const statusOptions = [
    { value: 'active', label: t('clients.statuses.active') },
    { value: 'inactive', label: t('clients.statuses.inactive') },
    { value: 'prospect', label: t('clients.statuses.prospect') },
  ];

  const govOptions = GOVERNORATES.map(g => ({ value: g, label: t(`clients.governorates.${g}`) }));

  const SectionHeader = ({ title, sectionKey }: { title: string; sectionKey: keyof typeof sections }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full py-2"
    >
      <span className="text-heading-sm font-semibold text-foreground">{title}</span>
      {sections[sectionKey] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  const footer = (
    <>
      <Button variant="outline" onClick={handleClose} disabled={isSaving} className="h-10">
        {t('common.cancel')}
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={isSaving}
        className="h-10 bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {isSaving && <Loader2 size={16} className="animate-spin me-2" />}
        {isSaving ? t('clients.form.saving') : isEdit ? t('clients.form.updateClient') : t('clients.form.saveClient')}
      </Button>
    </>
  );

  return (
    <>
      <SlideOver
        isOpen={isOpen}
        onClose={handleClose}
        title={isEdit ? t('clients.editClient') : t('clients.addClient')}
        titleAr={isEdit ? t('clients.editClient') : t('clients.addClient')}
        subtitle={t('clients.form.subtitle')}
        subtitleAr={t('clients.form.subtitle')}
        width="lg"
        footer={footer}
      >
        {isLoadingEdit ? (
          <div className="space-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* SECTION 1: Client Type */}
            <div className="grid grid-cols-2 gap-3">
              {(['individual', 'company'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateField('client_type', type)}
                  className={cn(
                    'h-[100px] flex flex-col items-center justify-center rounded-card border-2 transition-all duration-200',
                    form.client_type === type
                      ? 'border-accent bg-[#FFF8E1] text-accent'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/30',
                  )}
                >
                  {type === 'individual' ? <User size={24} /> : <Building2 size={24} />}
                  <span className="text-body-md font-medium mt-2">
                    {type === 'individual' ? t('clients.individual') : t('clients.company')}
                  </span>
                  <span className="text-body-sm opacity-70">
                    {type === 'individual' ? t('clients.form.aPerson') : t('clients.form.aBusinessEntity')}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-border" />

            {/* SECTION 2: Personal / Company Info */}
            <div>
              <SectionHeader
                title={form.client_type === 'individual' ? t('clients.form.personalInfo') : t('clients.form.companyInfo')}
                sectionKey="info"
              />
              {sections.info && (
                <div className="pt-4 space-y-4">
                  {form.client_type === 'individual' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('clients.fields.firstName')} required error={errors.first_name}>
                          <FormInput
                            value={form.first_name}
                            onChange={e => updateField('first_name', e.target.value)}
                            placeholder={language === 'ar' ? 'مثال: أحمد' : 'e.g., Ahmed'}
                            error={!!errors.first_name}
                            maxLength={50}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.lastName')} required error={errors.last_name}>
                          <FormInput
                            value={form.last_name}
                            onChange={e => updateField('last_name', e.target.value)}
                            placeholder={language === 'ar' ? 'مثال: الرشيد' : 'e.g., Al-Rashid'}
                            error={!!errors.last_name}
                            maxLength={50}
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('clients.fields.firstNameAr')}>
                          <FormInput
                            value={form.first_name_ar}
                            onChange={e => updateField('first_name_ar', e.target.value)}
                            placeholder="أحمد"
                            dir="rtl"
                            maxLength={50}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.lastNameAr')}>
                          <FormInput
                            value={form.last_name_ar}
                            onChange={e => updateField('last_name_ar', e.target.value)}
                            placeholder="الرشيد"
                            dir="rtl"
                            maxLength={50}
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField label={t('clients.fields.nationalId')} helperText={t('clients.form.nationalIdHelper')}>
                          <FormInput
                            value={form.national_id_number}
                            onChange={e => updateField('national_id_number', e.target.value)}
                            placeholder={language === 'ar' ? 'أدخل رقم الهوية' : 'Enter national ID'}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.dateOfBirth')}>
                          <FormDatePicker
                            value={form.date_of_birth}
                            onChange={d => updateField('date_of_birth', d)}
                            placeholder={language === 'ar' ? 'اختر تاريخ' : 'Pick a date'}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.gender')}>
                          <FormSelect
                            value={form.gender}
                            onValueChange={v => updateField('gender', v)}
                            placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                            options={[
                              { value: 'male', label: t('clients.fields.male') },
                              { value: 'female', label: t('clients.fields.female') },
                            ]}
                          />
                        </FormField>
                      </div>
                      <FormField label={t('clients.fields.nationality')}>
                        <FormInput
                          value={form.nationality}
                          onChange={e => updateField('nationality', e.target.value)}
                        />
                      </FormField>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('clients.fields.companyName')} required error={errors.company_name}>
                          <FormInput
                            value={form.company_name}
                            onChange={e => updateField('company_name', e.target.value)}
                            placeholder={language === 'ar' ? 'مثال: شركة الفرات التجارية' : 'e.g., Al-Furat Trading Co.'}
                            error={!!errors.company_name}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.companyNameAr')}>
                          <FormInput
                            value={form.company_name_ar}
                            onChange={e => updateField('company_name_ar', e.target.value)}
                            placeholder="شركة الفرات التجارية"
                            dir="rtl"
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('clients.fields.companyType')} required error={errors.company_type}>
                          <FormSelect
                            value={form.company_type}
                            onValueChange={v => updateField('company_type', v)}
                            placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                            options={companyTypeOptions}
                            error={!!errors.company_type}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.registrationNumber')}>
                          <FormInput
                            value={form.company_registration_number}
                            onChange={e => updateField('company_registration_number', e.target.value)}
                            placeholder={language === 'ar' ? 'رقم تسجيل الشركة' : 'Company registration number'}
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('clients.fields.industry')}>
                          <FormInput
                            value={form.industry}
                            onChange={e => updateField('industry', e.target.value)}
                            placeholder={language === 'ar' ? 'مثال: النفط والغاز، البناء' : 'e.g., Oil & Gas, Construction'}
                          />
                        </FormField>
                        <FormField label={t('clients.fields.taxId')}>
                          <FormInput
                            value={form.tax_id}
                            onChange={e => updateField('tax_id', e.target.value)}
                            placeholder={language === 'ar' ? 'رقم التعريف الضريبي' : 'Tax identification number'}
                          />
                        </FormField>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* SECTION 3: Contact Information */}
            <div>
              <SectionHeader title={t('clients.form.contactInfo')} sectionKey="contact" />
              {sections.contact && (
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={t('clients.fields.email')} error={errors.email}>
                      <FormInput
                        type="email"
                        value={form.email}
                        onChange={e => updateField('email', e.target.value)}
                        placeholder="client@example.com"
                        error={!!errors.email}
                        maxLength={255}
                      />
                    </FormField>
                    <FormField label={t('clients.fields.phone')} required error={errors.phone}>
                      <PhoneInput
                        value={form.phone}
                        onChange={v => updateField('phone', v)}
                        error={!!errors.phone}
                        placeholder={t('clients.form.phonePlaceholder')}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={t('clients.fields.secondaryPhone')}>
                      <PhoneInput
                        value={form.secondary_phone}
                        onChange={v => updateField('secondary_phone', v)}
                      />
                    </FormField>
                    <FormField label={t('clients.fields.whatsapp')} helperText={t('clients.form.whatsappHelper')}>
                      <PhoneInput
                        value={form.whatsapp_number}
                        onChange={v => updateField('whatsapp_number', v)}
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* SECTION 4: Address */}
            <div>
              <SectionHeader title={t('clients.form.addressSection')} sectionKey="address" />
              {sections.address && (
                <div className="pt-4 space-y-4">
                  <FormField label={t('clients.fields.address')}>
                    <FormTextarea
                      value={form.address}
                      onChange={e => updateField('address', e.target.value)}
                      placeholder={t('clients.form.addressPlaceholder')}
                      rows={2}
                      className="min-h-[72px]"
                    />
                  </FormField>
                  <FormField label={t('clients.fields.addressAr')}>
                    <FormTextarea
                      value={form.address_ar}
                      onChange={e => updateField('address_ar', e.target.value)}
                      placeholder={language === 'ar' ? t('clients.form.addressPlaceholder') : ''}
                      dir="rtl"
                      rows={2}
                      className="min-h-[72px]"
                    />
                  </FormField>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label={t('clients.fields.city')}>
                      <FormInput
                        value={form.city}
                        onChange={e => updateField('city', e.target.value)}
                      />
                    </FormField>
                    <FormField label={t('clients.fields.governorate')} required error={errors.governorate}>
                      <FormSelect
                        value={form.governorate}
                        onValueChange={v => updateField('governorate', v)}
                        placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                        options={govOptions}
                        error={!!errors.governorate}
                      />
                    </FormField>
                    <FormField label={language === 'ar' ? 'الدولة' : 'Country'}>
                      <FormInput value={language === 'ar' ? 'العراق' : 'Iraq'} disabled />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: Contact Persons (company only) */}
            {form.client_type === 'company' && (
              <>
                <div className="border-t border-border" />
                <div>
                  <div className="flex items-center justify-between">
                    <SectionHeader title={t('clients.contactPerson.title')} sectionKey="contacts" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setContactForm({ ...emptyContact }); setEditingContactIdx(null); setShowContactForm(true); }}
                      className="h-8"
                    >
                      <Plus size={14} className="me-1" /> {t('clients.contactPerson.add')}
                    </Button>
                  </div>
                  {sections.contacts && (
                    <div className="pt-3 space-y-3">
                      <p className="text-body-sm text-warning">{t('clients.form.contactRecommendation')}</p>

                      {contacts.map((c, idx) => (
                        <div key={idx} className="border border-border rounded-card p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-heading-sm font-semibold text-foreground">
                                {c.first_name} {c.last_name}
                              </span>
                              {c.is_primary && (
                                <span className="text-body-sm font-medium px-2 py-0.5 rounded-badge" style={{ backgroundColor: '#F0FDF4', color: '#22C55E' }}>
                                  {t('clients.contactPerson.primary')}
                                </span>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal size={14} /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                                <DropdownMenuItem onClick={() => editContact(idx)}>
                                  <Pencil size={12} className="me-2" /> {t('common.edit')}
                                </DropdownMenuItem>
                                {!c.is_primary && (
                                  <DropdownMenuItem onClick={() => setPrimaryContact(idx)}>
                                    {t('clients.contactPerson.setPrimary')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-destructive" onClick={() => removeContact(idx)}>
                                  <Trash2 size={12} className="me-2" /> {t('clients.form.remove')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex gap-4 mt-1 text-body-sm text-muted-foreground">
                            {c.email && <span>{c.email}</span>}
                            {c.phone && <span>{c.phone}</span>}
                          </div>
                          {(c.job_title || c.department) && (
                            <div className="text-body-sm text-muted-foreground/70 mt-0.5">
                              {[c.job_title, c.department].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      ))}

                      {showContactForm && (
                        <div className="border border-border rounded-card p-4 space-y-3 bg-muted/20">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label={t('clients.fields.firstName')} required>
                              <FormInput
                                value={contactForm.first_name}
                                onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))}
                                error={!contactForm.first_name.trim() && contactForm.last_name.trim() !== ''}
                              />
                            </FormField>
                            <FormField label={t('clients.fields.lastName')} required>
                              <FormInput
                                value={contactForm.last_name}
                                onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))}
                              />
                            </FormField>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label={t('clients.fields.firstNameAr')}>
                              <FormInput value={contactForm.first_name_ar} onChange={e => setContactForm(f => ({ ...f, first_name_ar: e.target.value }))} dir="rtl" />
                            </FormField>
                            <FormField label={t('clients.fields.lastNameAr')}>
                              <FormInput value={contactForm.last_name_ar} onChange={e => setContactForm(f => ({ ...f, last_name_ar: e.target.value }))} dir="rtl" />
                            </FormField>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label={t('clients.fields.email')}>
                              <FormInput type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
                            </FormField>
                            <FormField label={t('clients.fields.phone')}>
                              <FormInput type="tel" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
                            </FormField>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label={t('clients.contactPerson.jobTitle')}>
                              <FormInput value={contactForm.job_title} onChange={e => setContactForm(f => ({ ...f, job_title: e.target.value }))} />
                            </FormField>
                            <FormField label={t('clients.contactPerson.department')}>
                              <FormInput value={contactForm.department} onChange={e => setContactForm(f => ({ ...f, department: e.target.value }))} />
                            </FormField>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={contactForm.is_primary}
                              onCheckedChange={v => setContactForm(f => ({ ...f, is_primary: !!v }))}
                            />
                            <span className="text-body-sm">{t('clients.contactPerson.setPrimary')}</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={saveContactPerson} className="bg-accent text-accent-foreground hover:bg-accent/90">
                              {t('clients.form.saveContact')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setShowContactForm(false); setEditingContactIdx(null); }}>
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="border-t border-border" />

            {/* SECTION 6: Additional Information */}
            <div>
              <SectionHeader title={t('clients.form.additionalInfo')} sectionKey="additional" />
              {sections.additional && (
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label={t('clients.fields.source')}>
                      <FormSelect
                        value={form.source}
                        onValueChange={v => updateField('source', v)}
                        placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                        options={sourceOptions}
                      />
                    </FormField>
                    <FormField label={t('clients.fields.status')}>
                      <FormSelect
                        value={form.status}
                        onValueChange={v => updateField('status', v)}
                        options={statusOptions}
                      />
                    </FormField>
                  </div>

                  {/* Tags */}
                  <FormField label={t('clients.fields.tags')}>
                    <div className="border border-border rounded-input p-2 min-h-[44px] flex flex-wrap items-center gap-1.5">
                      {form.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-muted text-foreground text-body-sm rounded-badge px-2.5 py-1">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                        }}
                        placeholder={form.tags.length === 0 ? t('clients.form.addTags') : ''}
                        className="flex-1 min-w-[100px] bg-transparent outline-none text-body-md placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {suggestedTags.filter(t => !form.tags.includes(t)).map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="text-body-sm text-accent border border-accent/30 rounded-badge px-2.5 py-0.5 hover:bg-accent/10 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField label={t('clients.fields.notes')} helperText={t('clients.form.notesHelper')}>
                    <FormTextarea
                      value={form.notes}
                      onChange={e => updateField('notes', e.target.value)}
                      placeholder={t('clients.form.notesPlaceholder')}
                      rows={4}
                      maxLength={1000}
                    />
                  </FormField>
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        onConfirm={() => { setShowDiscardDialog(false); setIsDirty(false); onClose(); }}
        title={t('clients.form.unsavedTitle')}
        titleAr={t('clients.form.unsavedTitle')}
        message={t('clients.form.unsavedMessage')}
        messageAr={t('clients.form.unsavedMessage')}
        confirmLabel={t('clients.form.discard')}
        confirmLabelAr={t('clients.form.discard')}
        cancelLabel={t('clients.form.keepEditing')}
        cancelLabelAr={t('clients.form.keepEditing')}
        type="warning"
      />
    </>
  );
}
