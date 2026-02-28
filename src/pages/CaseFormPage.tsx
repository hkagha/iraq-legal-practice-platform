import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { Loader2, Plus, X, Trash2, Star, AlertTriangle } from 'lucide-react';
import ClientFormSlideOver from '@/components/clients/ClientFormSlideOver';

// Constants
const CASE_TYPES = ['civil','criminal','commercial','personal_status','labor','administrative','real_estate','family','corporate','contract','intellectual_property','tax','customs','other'] as const;
const COURT_TYPES = ['court_of_first_instance','misdemeanor_court','felony_court','criminal_court','personal_status_court','labor_court','commercial_court','administrative_court','court_of_appeal','court_of_cassation','federal_supreme_court','central_criminal_court','investigation_court','other'] as const;
const PRIORITIES = ['low','medium','high','urgent'] as const;
const BILLING_TYPES = ['hourly','fixed_fee','retainer','contingency','pro_bono'] as const;
const TEAM_ROLES = ['lead','member','reviewer','observer'] as const;

const CASE_TO_COURT_MAP: Record<string, string> = {
  criminal: 'criminal_court',
  personal_status: 'personal_status_court',
  labor: 'labor_court',
  commercial: 'commercial_court',
  administrative: 'administrative_court',
  civil: 'court_of_first_instance',
};

interface TeamMember {
  user_id: string;
  role: string;
  name: string;
  avatar_url?: string | null;
  job_title?: string | null;
}

interface ClientOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface FormData {
  title: string;
  title_ar: string;
  description: string;
  case_type: string;
  priority: string;
  client_id: string;
  opposing_party_name: string;
  opposing_party_name_ar: string;
  opposing_party_lawyer: string;
  opposing_party_lawyer_ar: string;
  opposing_party_phone: string;
  court_type: string;
  court_name: string;
  court_name_ar: string;
  court_location: string;
  court_case_number: string;
  court_chamber: string;
  judge_name: string;
  judge_name_ar: string;
  filing_date: Date | undefined;
  statute_of_limitations: Date | undefined;
  estimated_value: string;
  estimated_value_currency: string;
  billing_type: string;
  hourly_rate: string;
  fixed_fee_amount: string;
  retainer_amount: string;
  contingency_percentage: string;
  is_visible_to_client: boolean;
}

const emptyForm: FormData = {
  title: '', title_ar: '', description: '', case_type: '', priority: 'medium',
  client_id: '', opposing_party_name: '', opposing_party_name_ar: '',
  opposing_party_lawyer: '', opposing_party_lawyer_ar: '', opposing_party_phone: '',
  court_type: '', court_name: '', court_name_ar: '', court_location: '',
  court_case_number: '', court_chamber: '', judge_name: '', judge_name_ar: '',
  filing_date: undefined, statute_of_limitations: undefined,
  estimated_value: '', estimated_value_currency: 'IQD',
  billing_type: 'hourly', hourly_rate: '', fixed_fee_amount: '',
  retainer_amount: '', contingency_percentage: '',
  is_visible_to_client: true,
};

export default function CaseFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, t, isRTL } = useLanguage();
  const { profile } = useAuth();

  const isEdit = !!id;
  const preselectedClientId = searchParams.get('client_id') || '';

  const [form, setForm] = useState<FormData>({ ...emptyForm, client_id: preselectedClientId });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Client data
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);

  // Team member data
  const [orgMembers, setOrgMembers] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [showTeamRow, setShowTeamRow] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

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

  // Load org members for team assignment
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('profiles')
      .select('id,first_name,last_name,first_name_ar,last_name_ar,role,avatar_url,job_title')
      .eq('organization_id', profile.organization_id)
      .in('role', ['firm_admin', 'lawyer', 'paralegal'])
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        setOrgMembers(data.map((p: any) => {
          const name = language === 'ar' && p.first_name_ar
            ? `${p.first_name_ar} ${p.last_name_ar || ''}`
            : `${p.first_name} ${p.last_name}`;
          return { value: p.id, label: name.trim(), subtitle: t(`statuses.case.${p.role}`) || p.role };
        }));
      });
  }, [profile?.organization_id, language]);

  // Auto-add current user as lead
  useEffect(() => {
    if (!isEdit && profile && teamMembers.length === 0) {
      const name = language === 'ar' && profile.first_name_ar
        ? `${profile.first_name_ar} ${profile.last_name_ar || ''}`
        : `${profile.first_name} ${profile.last_name}`;
      setTeamMembers([{
        user_id: profile.id,
        role: 'lead',
        name: name.trim(),
        avatar_url: profile.avatar_url,
        job_title: profile.job_title,
      }]);
    }
  }, [profile, isEdit]);

  // Load case for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    setIsLoading(true);
    Promise.all([
      supabase.from('cases').select('*').eq('id', id).single(),
      supabase.from('case_team_members').select('user_id,role,profiles(first_name,last_name,first_name_ar,last_name_ar,avatar_url,job_title)').eq('case_id', id),
    ]).then(([caseRes, teamRes]) => {
      if (caseRes.error) {
        toast({ title: 'Error', description: caseRes.error.message, variant: 'destructive' });
        navigate('/cases');
        return;
      }
      const c = caseRes.data as any;
      setForm({
        title: c.title || '', title_ar: c.title_ar || '', description: c.description || '',
        case_type: c.case_type || '', priority: c.priority || 'medium',
        client_id: c.client_id || '',
        opposing_party_name: c.opposing_party_name || '', opposing_party_name_ar: c.opposing_party_name_ar || '',
        opposing_party_lawyer: c.opposing_party_lawyer || '', opposing_party_lawyer_ar: c.opposing_party_lawyer_ar || '',
        opposing_party_phone: c.opposing_party_phone || '',
        court_type: c.court_type || '', court_name: c.court_name || '', court_name_ar: c.court_name_ar || '',
        court_location: c.court_location || '', court_case_number: c.court_case_number || '',
        court_chamber: c.court_chamber || '', judge_name: c.judge_name || '', judge_name_ar: c.judge_name_ar || '',
        filing_date: c.filing_date ? new Date(c.filing_date) : undefined,
        statute_of_limitations: c.statute_of_limitations ? new Date(c.statute_of_limitations) : undefined,
        estimated_value: c.estimated_value?.toString() || '',
        estimated_value_currency: c.estimated_value_currency || 'IQD',
        billing_type: c.billing_type || 'hourly',
        hourly_rate: c.hourly_rate?.toString() || '',
        fixed_fee_amount: c.fixed_fee_amount?.toString() || '',
        retainer_amount: c.retainer_amount?.toString() || '',
        contingency_percentage: c.contingency_percentage?.toString() || '',
        is_visible_to_client: c.is_visible_to_client ?? true,
      });

      if (teamRes.data) {
        setTeamMembers((teamRes.data as any[]).map((tm: any) => {
          const p = tm.profiles;
          const name = language === 'ar' && p?.first_name_ar
            ? `${p.first_name_ar} ${p.last_name_ar || ''}`
            : `${p?.first_name || ''} ${p?.last_name || ''}`;
          return {
            user_id: tm.user_id,
            role: tm.role,
            name: name.trim(),
            avatar_url: p?.avatar_url,
            job_title: p?.job_title,
          };
        }));
      }
      setIsLoading(false);
    });
  }, [id, isEdit, language]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  // Auto-suggest court type from case type
  const handleCaseTypeChange = (value: string) => {
    updateField('case_type', value);
    const suggested = CASE_TO_COURT_MAP[value];
    if (suggested && !form.court_type) {
      updateField('court_type', suggested);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 5) errs.title = t('cases.form.titleRequired');
    if (!form.case_type) errs.case_type = t('cases.form.caseTypeRequired');
    if (!form.priority) errs.priority = t('cases.form.priorityRequired');
    if (!form.client_id) errs.client_id = t('cases.form.clientRequired');
    if (form.contingency_percentage) {
      const pct = parseFloat(form.contingency_percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) errs.contingency_percentage = t('cases.form.invalidPercentage');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast({ title: t('clients.messages.validationError'), variant: 'destructive' });
      // Scroll to first error
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
        case_type: form.case_type,
        priority: form.priority,
        client_id: form.client_id,
        court_type: form.court_type || null,
        court_name: form.court_name || null,
        court_name_ar: form.court_name_ar || null,
        court_location: form.court_location || null,
        court_case_number: form.court_case_number || null,
        court_chamber: form.court_chamber || null,
        judge_name: form.judge_name || null,
        judge_name_ar: form.judge_name_ar || null,
        opposing_party_name: form.opposing_party_name || null,
        opposing_party_name_ar: form.opposing_party_name_ar || null,
        opposing_party_lawyer: form.opposing_party_lawyer || null,
        opposing_party_lawyer_ar: form.opposing_party_lawyer_ar || null,
        opposing_party_phone: form.opposing_party_phone || null,
        filing_date: form.filing_date ? form.filing_date.toISOString().split('T')[0] : null,
        statute_of_limitations: form.statute_of_limitations ? form.statute_of_limitations.toISOString().split('T')[0] : null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        estimated_value_currency: form.estimated_value_currency,
        billing_type: form.billing_type,
        hourly_rate: form.billing_type === 'hourly' && form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        fixed_fee_amount: form.billing_type === 'fixed_fee' && form.fixed_fee_amount ? parseFloat(form.fixed_fee_amount) : null,
        retainer_amount: form.billing_type === 'retainer' && form.retainer_amount ? parseFloat(form.retainer_amount) : null,
        contingency_percentage: form.billing_type === 'contingency' && form.contingency_percentage ? parseFloat(form.contingency_percentage) : null,
        is_visible_to_client: form.is_visible_to_client,
        status: 'intake',
      };

      let caseId: string;

      if (isEdit) {
        payload.updated_by = profile.id;
        const { error } = await supabase.from('cases').update(payload as any).eq('id', id!);
        if (error) throw error;
        caseId = id!;

        // Sync team members: delete all and re-insert
        await supabase.from('case_team_members').delete().eq('case_id', caseId);
      } else {
        payload.organization_id = profile.organization_id;
        payload.created_by = profile.id;
        payload.updated_by = profile.id;
        payload.case_number = ''; // trigger will generate
        const { data, error } = await supabase.from('cases').insert(payload as any).select('id').single();
        if (error) throw error;
        caseId = data.id;
      }

      // Insert team members
      if (teamMembers.length > 0) {
        await supabase.from('case_team_members').insert(
          teamMembers.map(tm => ({
            case_id: caseId,
            user_id: tm.user_id,
            organization_id: profile.organization_id!,
            role: tm.role,
            assigned_by: profile.id,
          })) as any
        );
      }

      // Log case activity
      await supabase.from('case_activities').insert({
        case_id: caseId,
        organization_id: profile.organization_id,
        actor_id: profile.id,
        activity_type: isEdit ? 'case_updated' : 'case_created',
        title: isEdit ? 'Case updated' : 'Case created',
        title_ar: isEdit ? 'تم تحديث القضية' : 'تم إنشاء القضية',
        metadata: { case_type: form.case_type, priority: form.priority },
      } as any);

      // Log client activity
      if (!isEdit) {
        await supabase.from('client_activities').insert({
          client_id: form.client_id,
          organization_id: profile.organization_id,
          actor_id: profile.id,
          activity_type: 'case_created',
          title: 'New case created',
          title_ar: 'تم إنشاء قضية جديدة',
          related_entity_type: 'case',
          related_entity_id: caseId,
        } as any);
      }

      toast({ title: isEdit ? t('cases.messages.updated') : t('cases.messages.created') });
      setIsDirty(false);
      navigate(`/cases/${caseId}`);
    } catch (err: any) {
      toast({
        title: isEdit ? t('cases.messages.failedUpdate') : t('cases.messages.failedCreate'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setPendingNavigation('/cases');
      setShowDiscardDialog(true);
    } else {
      navigate('/cases');
    }
  };

  const addTeamMember = () => {
    if (!newMemberUserId) return;
    if (teamMembers.some(tm => tm.user_id === newMemberUserId)) return;
    const member = orgMembers.find(m => m.value === newMemberUserId);
    if (!member) return;
    setTeamMembers(prev => [...prev, {
      user_id: newMemberUserId,
      role: newMemberRole,
      name: member.label,
    }]);
    setNewMemberUserId('');
    setNewMemberRole('member');
    setShowTeamRow(false);
    setIsDirty(true);
  };

  const removeTeamMember = (userId: string) => {
    setTeamMembers(prev => prev.filter(tm => tm.user_id !== userId));
    setIsDirty(true);
  };

  // Statute of limitations warning
  const showStatuteWarning = useMemo(() => {
    if (!form.statute_of_limitations) return false;
    const diff = form.statute_of_limitations.getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }, [form.statute_of_limitations]);

  const hasLeadAttorney = teamMembers.some(tm => tm.role === 'lead');

  const caseTypeOptions = CASE_TYPES.map(k => ({ value: k, label: t(`cases.caseTypes.${k}`) }));
  const courtTypeOptions = COURT_TYPES.map(k => ({ value: k, label: t(`cases.courtTypes.${k}`) }));
  const priorityOptions = PRIORITIES.map(k => ({ value: k, label: t(`priority.${k}`) }));
  const billingTypeOptions = BILLING_TYPES.map(k => ({ value: k, label: t(`cases.billingTypes.${k}`) }));
  const teamRoleOptions = TEAM_ROLES.map(k => ({ value: k, label: t(`cases.teamRoles.${k}`) }));

  const SectionHeader = ({ number, title }: { number: number; title: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-body-sm font-semibold flex-shrink-0">
        {number}
      </div>
      <h3 className="text-heading-sm font-semibold text-foreground">{title}</h3>
    </div>
  );

  const SectionDivider = () => <div className="border-t border-border my-6" />;

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="" titleAr="" breadcrumbs={[
            { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
            { label: 'Cases', labelAr: 'القضايا', href: '/cases' },
            { label: '...', labelAr: '...' },
          ]}
        />
        <div className="max-w-[900px] mx-auto bg-card border border-border rounded-card shadow-sm p-8 space-y-6">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={isEdit ? t('cases.editCase') : t('cases.addCase')}
        titleAr={isEdit ? t('cases.editCase') : t('cases.addCase')}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Cases', labelAr: 'القضايا', href: '/cases' },
          { label: isEdit ? t('cases.editCase') : t('cases.addCase'), labelAr: isEdit ? t('cases.editCase') : t('cases.addCase') },
        ]}
      />

      <div className="max-w-[900px] mx-auto bg-card border border-border rounded-card shadow-sm p-6 sm:p-8">
        {/* SECTION 1: Basic Information */}
        <SectionHeader number={1} title={t('cases.form.basicInfo')} />
        <div className="space-y-4">
          <FormField label={t('cases.fields.title')} required error={errors.title} data-error={!!errors.title}>
            <FormInput
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder={language === 'ar' ? 'مثال: أحمد الرشيد ضد شركة التأمين الوطنية' : 'e.g., Ahmed Al-Rashid v. National Insurance Company'}
              error={!!errors.title}
              maxLength={200}
            />
          </FormField>

          <FormField label={t('cases.fields.titleAr')}>
            <FormInput
              value={form.title_ar}
              onChange={e => updateField('title_ar', e.target.value)}
              placeholder="أحمد الرشيد ضد شركة التأمين الوطنية"
              dir="rtl"
              maxLength={200}
            />
          </FormField>

          <FormField label={t('cases.fields.description')}>
            <FormTextarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder={t('common.description')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('cases.fields.caseType')} required error={errors.case_type}>
              <FormSelect
                value={form.case_type}
                onValueChange={handleCaseTypeChange}
                placeholder={t('cases.fields.caseType')}
                options={caseTypeOptions}
                error={!!errors.case_type}
              />
            </FormField>
            <FormField label={t('cases.fields.priority')} required error={errors.priority}>
              <FormSelect
                value={form.priority}
                onValueChange={v => updateField('priority', v)}
                placeholder={t('cases.fields.priority')}
                options={priorityOptions}
                error={!!errors.priority}
              />
            </FormField>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 2: Client & Opposing Party */}
        <SectionHeader number={2} title={t('cases.form.clientAndOpposing')} />
        <div className="space-y-4">
          <FormField label={t('cases.fields.client')} required error={errors.client_id}>
            <FormSearchSelect
              value={form.client_id}
              onChange={v => updateField('client_id', v)}
              placeholder={language === 'ar' ? 'ابحث واختر عميلاً...' : 'Search and select a client...'}
              options={clients}
              error={!!errors.client_id}
              showCreate
              createLabel={language === 'ar' ? 'إنشاء عميل جديد' : 'Create New Client'}
              onCreateNew={() => setShowClientForm(true)}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('cases.fields.opposingPartyName')}>
              <FormInput value={form.opposing_party_name} onChange={e => updateField('opposing_party_name', e.target.value)} />
            </FormField>
            <FormField label={t('cases.fields.opposingPartyNameAr')}>
              <FormInput value={form.opposing_party_name_ar} onChange={e => updateField('opposing_party_name_ar', e.target.value)} dir="rtl" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('cases.fields.opposingPartyLawyer')}>
              <FormInput value={form.opposing_party_lawyer} onChange={e => updateField('opposing_party_lawyer', e.target.value)} />
            </FormField>
            <FormField label={t('cases.fields.opposingPartyPhone')}>
              <FormInput value={form.opposing_party_phone} onChange={e => updateField('opposing_party_phone', e.target.value)} type="tel" />
            </FormField>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 3: Court Information */}
        <SectionHeader number={3} title={t('cases.form.courtInfo')} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('cases.fields.courtType')}>
              <FormSelect
                value={form.court_type}
                onValueChange={v => updateField('court_type', v)}
                placeholder={t('cases.fields.courtType')}
                options={courtTypeOptions}
              />
            </FormField>
            <FormField label={t('cases.fields.courtName')}>
              <FormInput
                value={form.court_name}
                onChange={e => updateField('court_name', e.target.value)}
                placeholder={language === 'ar' ? 'مثال: محكمة بداءة بغداد' : 'e.g., Baghdad Court of First Instance'}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('cases.fields.courtNameAr')}>
              <FormInput value={form.court_name_ar} onChange={e => updateField('court_name_ar', e.target.value)} dir="rtl" />
            </FormField>
            <FormField label={t('cases.fields.courtLocation')}>
              <FormInput value={form.court_location} onChange={e => updateField('court_location', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label={t('cases.fields.courtCaseNumber')} helperText={language === 'ar' ? 'رقم القضية الرسمي المعين من المحكمة' : 'The official case number assigned by the court'}>
              <FormInput value={form.court_case_number} onChange={e => updateField('court_case_number', e.target.value)} />
            </FormField>
            <FormField label={t('cases.fields.courtChamber')}>
              <FormInput value={form.court_chamber} onChange={e => updateField('court_chamber', e.target.value)} />
            </FormField>
            <FormField label={t('cases.fields.judgeName')}>
              <FormInput value={form.judge_name} onChange={e => updateField('judge_name', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('cases.fields.judgeNameAr')}>
              <FormInput value={form.judge_name_ar} onChange={e => updateField('judge_name_ar', e.target.value)} dir="rtl" />
            </FormField>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 4: Key Dates & Value */}
        <SectionHeader number={4} title={t('cases.form.datesAndValue')} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label={t('cases.fields.filingDate')}>
              <FormDatePicker
                value={form.filing_date}
                onChange={d => updateField('filing_date', d)}
                placeholder={t('cases.fields.filingDate')}
              />
            </FormField>
            <FormField
              label={t('cases.fields.statuteOfLimitations')}
              helperText={showStatuteWarning
                ? undefined
                : (language === 'ar' ? 'الموعد النهائي لهذه القضية' : 'Final deadline for this case')
              }
            >
              <FormDatePicker
                value={form.statute_of_limitations}
                onChange={d => updateField('statute_of_limitations', d)}
                placeholder={t('cases.fields.statuteOfLimitations')}
              />
              {showStatuteWarning && (
                <p className="text-body-sm text-warning flex items-center gap-1 mt-1">
                  <AlertTriangle size={12} /> {language === 'ar' ? '⚠ الموعد يقترب' : '⚠ Approaching deadline'}
                </p>
              )}
            </FormField>
            <FormField label={t('cases.fields.estimatedValue')}>
              <div className="flex">
                <select
                  value={form.estimated_value_currency}
                  onChange={e => updateField('estimated_value_currency', e.target.value)}
                  className="h-11 w-[70px] rounded-s-input border border-e-0 border-slate-300 bg-muted text-body-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
                <FormInput
                  value={form.estimated_value}
                  onChange={e => updateField('estimated_value', e.target.value)}
                  type="number"
                  placeholder="0.00"
                  className="rounded-s-none"
                />
              </div>
            </FormField>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 5: Team Assignment */}
        <SectionHeader number={5} title={t('cases.fields.teamMembers')} />
        <p className="text-body-sm text-muted-foreground mb-3">
          {language === 'ar' ? 'أضف المحامين والموظفين الذين سيعملون على هذه القضية' : 'Add lawyers and staff who will work on this case'}
        </p>

        {teamMembers.length > 0 && (
          <div className="space-y-2 mb-3">
            {teamMembers.map(tm => (
              <div key={tm.user_id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-body-sm font-medium text-muted-foreground flex-shrink-0">
                  {tm.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-medium text-foreground">{tm.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {tm.role === 'lead' && <Star size={14} className="text-accent fill-accent" />}
                  <span className="text-body-sm text-muted-foreground bg-muted rounded-badge px-2 py-0.5">
                    {t(`cases.teamRoles.${tm.role}`)}
                  </span>
                  <button type="button" onClick={() => removeTeamMember(tm.user_id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasLeadAttorney && teamMembers.length > 0 && (
          <p className="text-body-sm text-warning flex items-center gap-1 mb-3">
            <AlertTriangle size={12} /> {language === 'ar' ? 'يوصى بتعيين محامٍ رئيسي' : "It's recommended to assign a lead attorney"}
          </p>
        )}

        {showTeamRow ? (
          <div className="flex items-end gap-2 mb-3 flex-wrap">
            <div className="flex-[3] min-w-[200px]">
              <FormSearchSelect
                value={newMemberUserId}
                onChange={setNewMemberUserId}
                placeholder={language === 'ar' ? 'اختر عضو فريق...' : 'Select team member...'}
                options={orgMembers.filter(m => !teamMembers.some(tm => tm.user_id === m.value))}
              />
            </div>
            <div className="flex-[2] min-w-[140px]">
              <FormSelect
                value={newMemberRole}
                onValueChange={setNewMemberRole}
                options={teamRoleOptions}
              />
            </div>
            <div className="flex gap-1">
              <Button type="button" size="sm" onClick={addTeamMember} disabled={!newMemberUserId} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus size={14} />
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowTeamRow(false); setNewMemberUserId(''); }}>
                <X size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowTeamRow(true)}>
            <Plus size={14} className="me-1" /> {language === 'ar' ? 'إضافة عضو فريق' : 'Add Team Member'}
          </Button>
        )}

        <SectionDivider />

        {/* SECTION 6: Billing Configuration */}
        <SectionHeader number={6} title={t('cases.form.billingConfig')} />
        <div className="space-y-4">
          <div className="sm:w-1/2">
            <FormField label={t('cases.fields.billingType')} required>
              <FormSelect
                value={form.billing_type}
                onValueChange={v => updateField('billing_type', v)}
                options={billingTypeOptions}
              />
            </FormField>
          </div>

          {form.billing_type === 'hourly' && (
            <FormField label={t('cases.fields.hourlyRate')} helperText={language === 'ar' ? 'السعر الافتراضي لهذه القضية. يمكن تغييره لكل سجل وقت.' : 'Default rate for this case. Can be overridden per time entry.'}>
              <div className="sm:w-1/2">
                <FormInput value={form.hourly_rate} onChange={e => updateField('hourly_rate', e.target.value)} type="number" placeholder="0.00" />
              </div>
            </FormField>
          )}

          {form.billing_type === 'fixed_fee' && (
            <FormField label={t('cases.fields.fixedFee')}>
              <div className="sm:w-1/2">
                <FormInput value={form.fixed_fee_amount} onChange={e => updateField('fixed_fee_amount', e.target.value)} type="number" placeholder="0.00" />
              </div>
            </FormField>
          )}

          {form.billing_type === 'retainer' && (
            <FormField label={t('cases.fields.retainerAmount')} helperText={language === 'ar' ? 'مبلغ التوكيل الشهري' : 'Monthly retainer amount'}>
              <div className="sm:w-1/2">
                <FormInput value={form.retainer_amount} onChange={e => updateField('retainer_amount', e.target.value)} type="number" placeholder="0.00" />
              </div>
            </FormField>
          )}

          {form.billing_type === 'contingency' && (
            <FormField
              label={t('cases.fields.contingencyPercentage')}
              error={errors.contingency_percentage}
              helperText={language === 'ar' ? 'نسبة من مبلغ النتيجة' : 'Percentage of the outcome amount'}
            >
              <div className="sm:w-1/2 relative">
                <FormInput
                  value={form.contingency_percentage}
                  onChange={e => updateField('contingency_percentage', e.target.value)}
                  type="number"
                  placeholder="e.g., 25"
                  error={!!errors.contingency_percentage}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-body-sm">%</span>
              </div>
            </FormField>
          )}

          {form.billing_type === 'pro_bono' && (
            <p className="text-body-sm text-info">{language === 'ar' ? 'لن تتم فوترة هذه القضية' : 'This case will not be billed'}</p>
          )}
        </div>

        <SectionDivider />

        {/* SECTION 7: Client Visibility */}
        <SectionHeader number={7} title={t('cases.form.clientVisibility')} />
        <div className="flex items-start gap-3">
          <Checkbox
            checked={form.is_visible_to_client}
            onCheckedChange={v => updateField('is_visible_to_client', !!v)}
            className="mt-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
          />
          <div>
            <label className="text-body-md text-foreground cursor-pointer" onClick={() => updateField('is_visible_to_client', !form.is_visible_to_client)}>
              {language === 'ar' ? 'جعل هذه القضية مرئية للعميل في بوابته' : 'Make this case visible to the client in their portal'}
            </label>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              {language === 'ar' ? 'إذا تم التفعيل، يمكن للعميل مشاهدة حالة القضية وتقدمها في بوابته' : 'If enabled, the client can view case status and progress in their portal'}
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
              ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
              : isEdit
                ? t('cases.form.updateCase')
                : t('cases.form.createCase')
            }
          </Button>
        </div>
      </div>

      {/* Client Form Slide-Over */}
      <ClientFormSlideOver
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSaved={() => {
          // Refresh clients
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
          navigate(pendingNavigation || '/cases');
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
