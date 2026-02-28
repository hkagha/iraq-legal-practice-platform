import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Sparkles,
} from 'lucide-react';
import ClientFormSlideOver from '@/components/clients/ClientFormSlideOver';

// Category groups for the grouped dropdown
const CATEGORY_GROUPS = [
  { key: 'company', cats: ['company_registration', 'company_renewal', 'company_amendment'] },
  { key: 'tax', cats: ['tax_filing', 'tax_clearance'] },
  { key: 'licenses', cats: ['business_license', 'business_license_renewal', 'import_export_license', 'factory_license', 'hospital_license', 'restaurant_license', 'construction_permit', 'environmental_permit'] },
  { key: 'ip', cats: ['trademark_registration', 'brand_registration'] },
  { key: 'property', cats: ['property_registration', 'property_transfer'] },
  { key: 'personal', cats: ['passport_issuance', 'national_id', 'residency_permit', 'vehicle_registration'] },
  { key: 'legal', cats: ['power_of_attorney', 'document_attestation', 'court_document_processing', 'court_execution'] },
  { key: 'family', cats: ['inheritance_processing', 'marriage_registration', 'divorce_processing'] },
  { key: 'other', cats: ['other'] },
] as const;

const GROUP_LABELS: Record<string, { en: string; ar: string }> = {
  company: { en: 'Company', ar: 'شركات' },
  tax: { en: 'Tax', ar: 'ضرائب' },
  licenses: { en: 'Licenses', ar: 'التراخيص' },
  ip: { en: 'Intellectual Property', ar: 'الملكية الفكرية' },
  property: { en: 'Property', ar: 'العقارات' },
  personal: { en: 'Personal Documents', ar: 'الوثائق الشخصية' },
  legal: { en: 'Legal Documents', ar: 'المستندات القانونية' },
  family: { en: 'Family', ar: 'الأحوال الشخصية' },
  other: { en: 'Other', ar: 'أخرى' },
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

interface StepData {
  id?: string; // existing step id for edit mode
  _localId: string;
  step_number: number;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  is_required: boolean;
  assigned_to: string;
  due_date: Date | undefined;
  expanded: boolean;
}

interface ErrandFormData {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  category: string;
  priority: string;
  client_id: string;
  case_id: string;
  government_entity: string;
  government_entity_ar: string;
  government_department: string;
  government_department_ar: string;
  reference_number: string;
  start_date: Date | undefined;
  due_date: Date | undefined;
  assigned_to: string;
  government_fees: string;
  government_fees_currency: string;
  service_fee: string;
  service_fee_currency: string;
  fees_paid: boolean;
  is_visible_to_client: boolean;
}

const emptyForm: ErrandFormData = {
  title: '', title_ar: '', description: '', description_ar: '',
  category: '', priority: 'medium', client_id: '', case_id: '',
  government_entity: '', government_entity_ar: '',
  government_department: '', government_department_ar: '',
  reference_number: '',
  start_date: new Date(), due_date: undefined,
  assigned_to: '',
  government_fees: '', government_fees_currency: 'IQD',
  service_fee: '', service_fee_currency: 'IQD',
  fees_paid: false, is_visible_to_client: true,
};

let stepIdCounter = 0;
function newLocalId() { return `_step_${++stepIdCounter}_${Date.now()}`; }

function emptyStep(stepNumber: number): StepData {
  return {
    _localId: newLocalId(),
    step_number: stepNumber,
    title: '', title_ar: '', description: '', description_ar: '',
    is_required: true, assigned_to: '', due_date: undefined,
    expanded: true,
  };
}

export default function ErrandFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const isEdit = !!id;

  // Read URL params for pre-fill
  const searchParams = new URLSearchParams(window.location.search);
  const urlClientId = searchParams.get('clientId') || '';
  const urlCaseId = searchParams.get('caseId') || '';

  const [form, setForm] = useState<ErrandFormData>({ ...emptyForm });
  const [steps, setSteps] = useState<StepData[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Template
  const [templateAvailable, setTemplateAvailable] = useState<any>(null);
  const [templateDismissed, setTemplateDismissed] = useState(false);

  // Data
  const [clients, setClients] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [clientCases, setClientCases] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [orgMembers, setOrgMembers] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load clients
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('clients')
      .select('id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type,email')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setClients(data.map((c: any) => {
          const name = c.client_type === 'company'
            ? (language === 'ar' ? c.company_name_ar || c.company_name : c.company_name) || ''
            : (language === 'ar' && c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}` : `${c.first_name || ''} ${c.last_name || ''}`).trim();
          return { value: c.id, label: name, subtitle: c.email || '' };
        }));
      });
  }, [profile?.organization_id, language]);

  // Load org members
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('profiles')
      .select('id,first_name,last_name,first_name_ar,last_name_ar,role')
      .eq('organization_id', profile.organization_id)
      .in('role', ['firm_admin', 'lawyer', 'paralegal'])
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        setOrgMembers(data.map((p: any) => {
          const name = language === 'ar' && p.first_name_ar
            ? `${p.first_name_ar} ${p.last_name_ar || ''}`
            : `${p.first_name} ${p.last_name}`;
          return { value: p.id, label: name.trim(), subtitle: p.role };
        }));
      });
  }, [profile?.organization_id, language]);

  // Set default assigned_to and pre-fill from URL params
  useEffect(() => {
    if (!isEdit && profile) {
      setForm(f => ({
        ...f,
        assigned_to: f.assigned_to || profile.id,
        client_id: f.client_id || urlClientId,
        case_id: f.case_id || urlCaseId,
      }));
    }
  }, [profile, isEdit, urlClientId, urlCaseId]);

  // Load cases for selected client
  useEffect(() => {
    if (!form.client_id) {
      setClientCases([]);
      return;
    }
    supabase
      .from('cases')
      .select('id,case_number,title,title_ar,status')
      .eq('client_id', form.client_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setClientCases(data.map((c: any) => ({
          value: c.id,
          label: `${c.case_number} — ${language === 'ar' && c.title_ar ? c.title_ar : c.title}`,
          subtitle: t(`statuses.case.${c.status}`),
        })));
      });
  }, [form.client_id, language]);

  // Check template when category changes
  useEffect(() => {
    if (!form.category || isEdit) { setTemplateAvailable(null); return; }
    setTemplateDismissed(false);
    supabase
      .from('errand_templates')
      .select('*')
      .eq('category', form.category)
      .eq('is_system', true)
      .limit(1)
      .then(({ data }) => {
        setTemplateAvailable(data && data.length > 0 ? data[0] : null);
      });
  }, [form.category, isEdit]);

  // Load errand for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    setIsLoading(true);
    Promise.all([
      supabase.from('errands').select('*').eq('id', id).single(),
      supabase.from('errand_steps').select('*').eq('errand_id', id).order('step_number'),
    ]).then(([errandRes, stepsRes]) => {
      if (errandRes.error) {
        toast({ title: 'Error', description: errandRes.error.message, variant: 'destructive' });
        navigate('/errands');
        return;
      }
      const e = errandRes.data as any;
      setForm({
        title: e.title || '', title_ar: e.title_ar || '',
        description: e.description || '', description_ar: e.description_ar || '',
        category: e.category || '', priority: e.priority || 'medium',
        client_id: e.client_id || '', case_id: e.case_id || '',
        government_entity: e.government_entity || '',
        government_entity_ar: e.government_entity_ar || '',
        government_department: e.government_department || '',
        government_department_ar: e.government_department_ar || '',
        reference_number: e.reference_number || '',
        start_date: e.start_date ? new Date(e.start_date) : undefined,
        due_date: e.due_date ? new Date(e.due_date) : undefined,
        assigned_to: e.assigned_to || '',
        government_fees: e.government_fees?.toString() || '',
        government_fees_currency: e.government_fees_currency || 'IQD',
        service_fee: e.service_fee?.toString() || '',
        service_fee_currency: e.service_fee_currency || 'IQD',
        fees_paid: e.fees_paid ?? false,
        is_visible_to_client: e.is_visible_to_client ?? true,
      });

      if (stepsRes.data) {
        setSteps((stepsRes.data as any[]).map(s => ({
          id: s.id,
          _localId: newLocalId(),
          step_number: s.step_number,
          title: s.title || '',
          title_ar: s.title_ar || '',
          description: s.description || '',
          description_ar: s.description_ar || '',
          is_required: s.is_required ?? true,
          assigned_to: s.assigned_to || '',
          due_date: s.due_date ? new Date(s.due_date) : undefined,
          expanded: false,
        })));
      }
      setIsLoading(false);
    });
  }, [id, isEdit]);

  const updateField = <K extends keyof ErrandFormData>(key: K, value: ErrandFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const updateStep = (localId: string, field: keyof StepData, value: any) => {
    setSteps(prev => prev.map(s => s._localId === localId ? { ...s, [field]: value } : s));
    setIsDirty(true);
    if (errors.steps) setErrors(e => { const n = { ...e }; delete n.steps; return n; });
  };

  const addStep = () => {
    const newStep = emptyStep(steps.length + 1);
    setSteps(prev => [...prev, newStep]);
    setIsDirty(true);
    // Scroll to new step after render
    setTimeout(() => {
      document.getElementById(`step-${newStep._localId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const removeStep = (localId: string) => {
    setSteps(prev => {
      const filtered = prev.filter(s => s._localId !== localId);
      return filtered.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
    setIsDirty(true);
  };

  const applyTemplate = () => {
    if (!templateAvailable?.steps) return;
    const templateSteps = (templateAvailable.steps as any[]).map((ts: any, i: number) => ({
      _localId: newLocalId(),
      step_number: i + 1,
      title: ts.title || '',
      title_ar: ts.title_ar || '',
      description: ts.description || '',
      description_ar: ts.description_ar || '',
      is_required: true,
      assigned_to: '',
      due_date: undefined,
      expanded: false,
    } as StepData));
    setSteps(templateSteps);
    setTemplateDismissed(true);
    setIsDirty(true);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setSteps(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, moved);
      return arr.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
    setDragIndex(null);
    setDragOverIndex(null);
    setIsDirty(true);
  };

  // Build category options (flat list for FormSelect, groups indicated by disabled labels)
  const categoryOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    CATEGORY_GROUPS.forEach(g => {
      g.cats.forEach(c => {
        opts.push({ value: c, label: t(`errands.categories.${c}`) });
      });
    });
    return opts;
  }, [t]);

  const priorityOptions = PRIORITIES.map(k => ({ value: k, label: t(`priority.${k}`) }));

  const totalCost = useMemo(() => {
    const gov = parseFloat(form.government_fees) || 0;
    const svc = parseFloat(form.service_fee) || 0;
    return gov + svc;
  }, [form.government_fees, form.service_fee]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 5) errs.title = language === 'ar' ? 'عنوان المعاملة مطلوب (5 أحرف على الأقل)' : 'Errand title is required (minimum 5 characters)';
    if (!form.category) errs.category = language === 'ar' ? 'التصنيف مطلوب' : 'Category is required';
    if (!form.priority) errs.priority = language === 'ar' ? 'الأولوية مطلوبة' : 'Priority is required';
    if (!form.client_id) errs.client_id = language === 'ar' ? 'العميل مطلوب' : 'Client is required';
    if (steps.length === 0) errs.steps = language === 'ar' ? 'مطلوبة خطوة واحدة على الأقل' : 'At least one step is required';
    else {
      const emptyTitle = steps.find(s => !s.title.trim());
      if (emptyTitle) errs.steps = language === 'ar' ? 'كل خطوة تحتاج عنوان' : 'Each step must have a title';
    }
    if (form.due_date && form.start_date && form.due_date < form.start_date) {
      errs.due_date = language === 'ar' ? 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ البدء' : 'Due date must be after start date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({ title: t('errands.messages.validationError'), variant: 'destructive' });
      const firstErr = document.querySelector('[data-error="true"]');
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!profile?.organization_id) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        title_ar: form.title_ar.trim() || null,
        description: form.description.trim() || null,
        description_ar: form.description_ar.trim() || null,
        category: form.category,
        priority: form.priority,
        client_id: form.client_id,
        case_id: form.case_id || null,
        government_entity: form.government_entity || null,
        government_entity_ar: form.government_entity_ar || null,
        government_department: form.government_department || null,
        government_department_ar: form.government_department_ar || null,
        reference_number: form.reference_number || null,
        start_date: form.start_date ? form.start_date.toISOString().split('T')[0] : null,
        due_date: form.due_date ? form.due_date.toISOString().split('T')[0] : null,
        assigned_to: form.assigned_to || null,
        government_fees: form.government_fees ? parseFloat(form.government_fees) : 0,
        government_fees_currency: form.government_fees_currency,
        service_fee: form.service_fee ? parseFloat(form.service_fee) : 0,
        service_fee_currency: form.service_fee_currency,
        fees_paid: form.fees_paid,
        is_visible_to_client: form.is_visible_to_client,
        total_steps: steps.length,
        completed_steps: 0,
      };

      let errandId: string;

      if (isEdit) {
        payload.updated_by = profile.id;
        const { error } = await supabase.from('errands').update(payload as any).eq('id', id!);
        if (error) throw error;
        errandId = id!;

        // Delete old steps and re-insert
        await supabase.from('errand_steps').delete().eq('errand_id', errandId);
      } else {
        payload.organization_id = profile.organization_id;
        payload.created_by = profile.id;
        payload.updated_by = profile.id;
        payload.errand_number = ''; // trigger generates
        const { data, error } = await supabase.from('errands').insert(payload as any).select('id').single();
        if (error) throw error;
        errandId = data.id;
      }

      // Insert steps
      if (steps.length > 0) {
        const stepPayloads = steps.map((s, i) => ({
          errand_id: errandId,
          organization_id: profile.organization_id!,
          step_number: i + 1,
          title: s.title.trim(),
          title_ar: s.title_ar.trim() || null,
          description: s.description.trim() || null,
          description_ar: s.description_ar.trim() || null,
          is_required: s.is_required,
          assigned_to: s.assigned_to || null,
          due_date: s.due_date ? s.due_date.toISOString().split('T')[0] : null,
          status: 'pending',
        }));
        const { error: stepErr } = await supabase.from('errand_steps').insert(stepPayloads as any);
        if (stepErr) throw stepErr;
      }

      // Log errand activity
      await supabase.from('errand_activities').insert({
        errand_id: errandId,
        organization_id: profile.organization_id,
        actor_id: profile.id,
        activity_type: isEdit ? 'errand_updated' : 'errand_created',
        title: isEdit ? 'Errand updated' : 'Errand created',
        title_ar: isEdit ? 'تم تحديث المعاملة' : 'تم إنشاء المعاملة',
        metadata: { category: form.category, priority: form.priority },
      } as any);

      // Log client activity
      if (!isEdit) {
        await supabase.from('client_activities').insert({
          client_id: form.client_id,
          organization_id: profile.organization_id,
          actor_id: profile.id,
          activity_type: 'errand_created',
          title: 'New errand created',
          title_ar: 'تم إنشاء معاملة جديدة',
          related_entity_type: 'errand',
          related_entity_id: errandId,
        } as any);
      }

      toast({ title: isEdit ? t('errands.messages.updated') : t('errands.messages.created') });
      setIsDirty(false);
      navigate(`/errands/${errandId}`);
    } catch (err: any) {
      toast({
        title: language === 'ar' ? 'فشل في حفظ المعاملة' : 'Failed to save errand',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setPendingNavigation('/errands');
      setShowDiscardDialog(true);
    } else {
      navigate('/errands');
    }
  };

  const SectionHeader = ({ number, title }: { number: number; title: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-body-sm font-semibold flex-shrink-0">
        {number}
      </div>
      <h3 className="text-heading-sm font-semibold text-foreground">{title}</h3>
    </div>
  );

  const SectionDivider = () => <div className="border-t border-border my-6" />;

  const dueWarning = useMemo(() => {
    if (!form.due_date) return false;
    const diff = form.due_date.getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }, [form.due_date]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="" titleAr="" breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Errands', labelAr: 'المعاملات', href: '/errands' },
          { label: '...', labelAr: '...' },
        ]} />
        <div className="max-w-[900px] mx-auto bg-card border border-border rounded-card shadow-sm p-8 space-y-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={isEdit ? t('errands.editErrand') : t('errands.addErrand')}
        titleAr={isEdit ? t('errands.editErrand') : t('errands.addErrand')}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Errands', labelAr: 'المعاملات', href: '/errands' },
          { label: isEdit ? t('errands.editErrand') : t('errands.addErrand'), labelAr: isEdit ? t('errands.editErrand') : t('errands.addErrand') },
        ]}
      />

      <div className="max-w-[900px] mx-auto bg-card border border-border rounded-card shadow-sm p-6 sm:p-8">
        {/* SECTION 1: Basic Information */}
        <SectionHeader number={1} title={language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'} />
        <div className="space-y-4">
          <FormField label={t('errands.fields.title')} required error={errors.title} data-error={!!errors.title}>
            <FormInput
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder={language === 'ar' ? 'مثال: تسجيل شركة الفرات التجارية' : 'e.g., Company Registration for Al-Furat Trading'}
              error={!!errors.title}
              maxLength={200}
            />
          </FormField>

          <FormField label={t('errands.fields.titleAr')}>
            <FormInput
              value={form.title_ar}
              onChange={e => updateField('title_ar', e.target.value)}
              placeholder="تسجيل شركة الفرات التجارية"
              dir="rtl"
              maxLength={200}
            />
          </FormField>

          <FormField label={t('errands.fields.description')}>
            <FormTextarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder={t('common.description')}
              className="min-h-[80px]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('errands.fields.category')} required error={errors.category}>
              <FormSelect
                value={form.category}
                onValueChange={v => updateField('category', v)}
                placeholder={t('errands.fields.category')}
                options={categoryOptions}
                error={!!errors.category}
              />
            </FormField>
            <FormField label={t('errands.fields.priority')} required error={errors.priority}>
              <FormSelect
                value={form.priority}
                onValueChange={v => updateField('priority', v)}
                placeholder={t('errands.fields.priority')}
                options={priorityOptions}
                error={!!errors.priority}
              />
            </FormField>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 2: Client & Related Case */}
        <SectionHeader number={2} title={language === 'ar' ? 'العميل والقضية المرتبطة' : 'Client & Related Case'} />
        <div className="space-y-4">
          <FormField label={t('errands.fields.client')} required error={errors.client_id}>
            <FormSearchSelect
              value={form.client_id}
              onChange={v => { updateField('client_id', v); updateField('case_id', ''); }}
              placeholder={language === 'ar' ? 'ابحث واختر عميلاً...' : 'Search and select a client...'}
              options={clients}
              error={!!errors.client_id}
              showCreate
              createLabel={language === 'ar' ? 'إنشاء عميل جديد' : 'Create New Client'}
              onCreateNew={() => setShowClientForm(true)}
            />
          </FormField>

          <FormField
            label={language === 'ar' ? 'القضية المرتبطة (اختياري)' : 'Linked Case (Optional)'}
            helperText={language === 'ar' ? 'اربط هذه المعاملة بقضية إذا كانت مرتبطة' : 'Link this errand to a case if it\'s related'}
          >
            <FormSearchSelect
              value={form.case_id}
              onChange={v => updateField('case_id', v)}
              placeholder={!form.client_id
                ? (language === 'ar' ? 'اختر عميلاً أولاً' : 'Select a client first')
                : (language === 'ar' ? 'ابحث واربط بقضية موجودة...' : 'Search and link to an existing case...')}
              options={clientCases}
              disabled={!form.client_id}
            />
          </FormField>
        </div>

        <SectionDivider />

        {/* SECTION 3: Government Entity & Dates */}
        <SectionHeader number={3} title={language === 'ar' ? 'الجهة الحكومية والتواريخ' : 'Government Entity & Dates'} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('errands.fields.governmentEntity')}>
              <FormInput
                value={form.government_entity}
                onChange={e => updateField('government_entity', e.target.value)}
                placeholder={language === 'ar' ? 'مثال: وزارة التجارة' : 'e.g., Ministry of Trade'}
              />
            </FormField>
            <FormField label={language === 'ar' ? 'الجهة الحكومية (عربي)' : 'Government Entity (Arabic)'}>
              <FormInput
                value={form.government_entity_ar}
                onChange={e => updateField('government_entity_ar', e.target.value)}
                placeholder="وزارة التجارة"
                dir="rtl"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('errands.fields.governmentDepartment')}>
              <FormInput
                value={form.government_department}
                onChange={e => updateField('government_department', e.target.value)}
                placeholder={language === 'ar' ? 'مثال: مسجل الشركات' : 'e.g., Companies Registrar'}
              />
            </FormField>
            <FormField
              label={t('errands.fields.referenceNumber')}
              helperText={language === 'ar' ? 'رقم التتبع المعين من الجهة الحكومية' : 'The tracking number assigned by the government entity'}
            >
              <FormInput
                value={form.reference_number}
                onChange={e => updateField('reference_number', e.target.value)}
                placeholder={language === 'ar' ? 'رقم التتبع الحكومي' : 'Government reference or tracking number'}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label={t('errands.fields.startDate')}>
              <FormDatePicker
                value={form.start_date}
                onChange={d => updateField('start_date', d)}
                placeholder={t('errands.fields.startDate')}
              />
            </FormField>
            <FormField label={t('errands.fields.dueDate')} error={errors.due_date}>
              <FormDatePicker
                value={form.due_date}
                onChange={d => updateField('due_date', d)}
                placeholder={t('errands.fields.dueDate')}
                error={!!errors.due_date}
              />
              {dueWarning && (
                <p className="text-body-sm text-warning flex items-center gap-1 mt-1">
                  ⚠ {language === 'ar' ? 'الموعد يقترب' : 'Due date approaching'}
                </p>
              )}
            </FormField>
            <FormField label={t('errands.fields.assignedTo')}>
              <FormSearchSelect
                value={form.assigned_to}
                onChange={v => updateField('assigned_to', v)}
                placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                options={orgMembers}
              />
            </FormField>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 4: Steps */}
        <SectionHeader number={4} title={language === 'ar' ? 'خطوات سير العمل' : 'Workflow Steps'} />
        <p className="text-body-sm text-muted-foreground mb-4">
          {language === 'ar' ? 'حدد الخطوات المطلوبة لإكمال هذه المعاملة. يمكن إعادة ترتيب الخطوات بالسحب.' : 'Define the steps needed to complete this errand. Steps can be reordered by dragging.'}
        </p>

        {/* Template prompt */}
        {templateAvailable && !templateDismissed && steps.length === 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-accent" />
              <span className="text-heading-sm font-semibold text-accent">
                {language === 'ar' ? 'قالب متاح' : 'Template Available'}
              </span>
            </div>
            <p className="text-body-md text-muted-foreground mb-3">
              {language === 'ar'
                ? `لدينا قالب جاهز لـ ${t(`errands.categories.${form.category}`)}. هل تريد استخدامه؟`
                : `We have a pre-built template for ${t(`errands.categories.${form.category}`)}. Would you like to use it?`}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={applyTemplate} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {t('errands.steps.useTemplate')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTemplateDismissed(true)}>
                {t('errands.steps.customSteps')}
              </Button>
            </div>
          </div>
        )}

        {errors.steps && (
          <p className="text-body-sm text-destructive mb-3">{errors.steps}</p>
        )}

        {/* Step list */}
        <div className="space-y-2 mb-3">
          {steps.map((step, index) => (
            <div
              key={step._localId}
              id={`step-${step._localId}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={cn(
                'border border-border rounded-lg bg-card transition-shadow',
                dragIndex === index && 'opacity-50 shadow-lg',
                dragOverIndex === index && dragIndex !== index && 'border-accent border-2',
              )}
            >
              {/* Collapsed header */}
              <div className="flex items-center gap-2 px-3 py-3 cursor-pointer" onClick={() => updateStep(step._localId, 'expanded', !step.expanded)}>
                <GripVertical size={16} className="text-muted-foreground cursor-grab flex-shrink-0" />
                <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {step.step_number}
                </div>
                <span className={cn('flex-1 text-body-md font-medium text-foreground truncate', !step.title && 'text-muted-foreground italic')}>
                  {step.title || (language === 'ar' ? 'خطوة بدون عنوان' : 'Untitled step')}
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeStep(step._localId); }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
                {step.expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </div>

              {/* Expanded fields */}
              {step.expanded && (
                <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label={t('errands.steps.stepTitle')} required>
                      <FormInput
                        value={step.title}
                        onChange={e => updateStep(step._localId, 'title', e.target.value)}
                        placeholder={language === 'ar' ? 'عنوان الخطوة' : 'Step title'}
                        error={!step.title.trim() && !!errors.steps}
                      />
                    </FormField>
                    <FormField label={language === 'ar' ? 'عنوان الخطوة (عربي)' : 'Step Title (Arabic)'}>
                      <FormInput
                        value={step.title_ar}
                        onChange={e => updateStep(step._localId, 'title_ar', e.target.value)}
                        dir="rtl"
                      />
                    </FormField>
                  </div>
                  <FormField label={t('errands.steps.stepDescription')}>
                    <FormTextarea
                      value={step.description}
                      onChange={e => updateStep(step._localId, 'description', e.target.value)}
                      className="min-h-[60px]"
                    />
                  </FormField>
                  <FormField label={language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}>
                    <FormTextarea
                      value={step.description_ar}
                      onChange={e => updateStep(step._localId, 'description_ar', e.target.value)}
                      className="min-h-[60px]"
                      dir="rtl"
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox
                        checked={step.is_required}
                        onCheckedChange={v => updateStep(step._localId, 'is_required', !!v)}
                        className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                      />
                      <label className="text-body-sm text-foreground">{language === 'ar' ? 'مطلوبة' : 'Required'}</label>
                    </div>
                    <FormField label={t('errands.steps.assignTo')}>
                      <FormSearchSelect
                        value={step.assigned_to}
                        onChange={v => updateStep(step._localId, 'assigned_to', v)}
                        placeholder={language === 'ar' ? 'اختر...' : 'Select...'}
                        options={orgMembers}
                      />
                    </FormField>
                    <FormField label={t('errands.fields.dueDate')}>
                      <FormDatePicker
                        value={step.due_date}
                        onChange={d => updateStep(step._localId, 'due_date', d)}
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addStep}>
          <Plus size={14} className="me-1" /> {t('errands.steps.addStep')}
        </Button>

        <SectionDivider />

        {/* SECTION 5: Fees & Cost */}
        <SectionHeader number={5} title={language === 'ar' ? 'الرسوم والتكلفة' : 'Fees & Cost'} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label={t('errands.fields.governmentFees')}>
              <div className="flex">
                <select
                  value={form.government_fees_currency}
                  onChange={e => updateField('government_fees_currency', e.target.value)}
                  className="h-11 w-[70px] rounded-s-input border border-e-0 border-slate-300 bg-muted text-body-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
                <FormInput
                  value={form.government_fees}
                  onChange={e => updateField('government_fees', e.target.value)}
                  type="number"
                  placeholder="0.00"
                  className="rounded-s-none"
                />
              </div>
            </FormField>
            <FormField
              label={t('errands.fields.serviceFee')}
              helperText={language === 'ar' ? 'رسوم مكتبك لمعالجة هذه المعاملة' : "Your firm's fee for handling this errand"}
            >
              <div className="flex">
                <select
                  value={form.service_fee_currency}
                  onChange={e => updateField('service_fee_currency', e.target.value)}
                  className="h-11 w-[70px] rounded-s-input border border-e-0 border-slate-300 bg-muted text-body-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
                <FormInput
                  value={form.service_fee}
                  onChange={e => updateField('service_fee', e.target.value)}
                  type="number"
                  placeholder="0.00"
                  className="rounded-s-none"
                />
              </div>
            </FormField>
            <FormField label={t('errands.fields.totalCost')}>
              <FormInput
                value={totalCost.toLocaleString()}
                disabled
                className="bg-muted"
              />
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.fees_paid}
              onCheckedChange={v => updateField('fees_paid', !!v)}
              className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <label className="text-body-md text-foreground cursor-pointer" onClick={() => updateField('fees_paid', !form.fees_paid)}>
              {language === 'ar' ? 'تم دفع الرسوم' : 'Fees have been paid'}
            </label>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 6: Visibility */}
        <SectionHeader number={6} title={language === 'ar' ? 'الرؤية' : 'Visibility'} />
        <div className="flex items-start gap-3">
          <Checkbox
            checked={form.is_visible_to_client}
            onCheckedChange={v => updateField('is_visible_to_client', !!v)}
            className="mt-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
          />
          <div>
            <label className="text-body-md text-foreground cursor-pointer" onClick={() => updateField('is_visible_to_client', !form.is_visible_to_client)}>
              {language === 'ar' ? 'جعل هذه المعاملة مرئية للعميل في بوابته' : 'Make this errand visible to the client in their portal'}
            </label>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              {language === 'ar' ? 'إذا تم التفعيل، يمكن للعميل مشاهدة حالة المعاملة وتقدمها في بوابته' : 'If enabled, the client can view errand status and progress in their portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-40">
        <div className="max-w-[900px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
            {isSaving && <Loader2 size={16} className="animate-spin me-2" />}
            {isSaving
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : isEdit
                ? (language === 'ar' ? 'تحديث المعاملة' : 'Update Errand')
                : (language === 'ar' ? 'إنشاء المعاملة' : 'Create Errand')
            }
          </Button>
        </div>
      </div>

      {/* Client Form Slide-Over */}
      <ClientFormSlideOver
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSaved={() => {
          if (profile?.organization_id) {
            supabase
              .from('clients')
              .select('id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type,email')
              .eq('organization_id', profile.organization_id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .then(({ data }) => {
                if (data?.[0]) {
                  const c = data[0] as any;
                  const name = c.client_type === 'company'
                    ? c.company_name || ''
                    : `${c.first_name || ''} ${c.last_name || ''}`.trim();
                  setClients(prev => [{ value: c.id, label: name, subtitle: c.email || '' }, ...prev]);
                  updateField('client_id', c.id);
                }
              });
          }
        }}
      />

      {/* Discard Confirmation */}
      <ConfirmDialog
        isOpen={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        onConfirm={() => {
          setShowDiscardDialog(false);
          setIsDirty(false);
          navigate(pendingNavigation || '/errands');
        }}
        title="Unsaved Changes"
        titleAr="تغييرات غير محفوظة"
        message="You have unsaved changes. Are you sure you want to discard them?"
        messageAr="لديك تغييرات غير محفوظة. هل تريد تجاهلها؟"
        confirmLabel="Discard"
        confirmLabelAr="تجاهل"
        type="warning"
      />
    </div>
  );
}
