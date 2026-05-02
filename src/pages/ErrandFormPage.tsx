import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormDatePicker } from '@/components/ui/FormDatePicker';
import { PartySelector } from '@/components/parties/PartySelector';
import { PageLoader } from '@/components/ui/PageLoader';
import type { PartyRef } from '@/types/parties';

const ERRAND_TYPES = ['government_registration', 'license_renewal', 'document_authentication', 'court_filing', 'permit_application', 'tax_filing', 'other'];
const STATUSES = ['intake', 'in_progress', 'waiting_on_client', 'waiting_on_authority', 'completed', 'cancelled', 'archived'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const BILLING_TYPES = ['fixed_fee', 'hourly', 'retainer', 'contingency', 'pro_bono'];
const CURRENCIES = ['IQD', 'USD'];

export default function ErrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [party, setParty] = useState<PartyRef | null>(null);
  const [cases, setCases] = useState<{ id: string; case_number: string; title: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; first_name: string; last_name: string; role: string }[]>([]);

  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    errand_type: 'other',
    status: 'intake',
    priority: 'normal',
    due_date: undefined as Date | undefined,
    case_id: '',
    assigned_to: '',
    is_visible_to_client: false,
    billing_type: 'fixed_fee',
    hourly_rate: '',
    fixed_fee_amount: '',
    retainer_amount: '',
    contingency_percentage: '',
    estimated_value: '',
    estimated_value_currency: 'IQD',
  });

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id).order('updated_at', { ascending: false }).limit(200).then(({ data }) => setCases(data || []));
    supabase.from('profiles').select('id, first_name, last_name, role').eq('organization_id', profile.organization_id).eq('is_active', true).in('role', ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant']).order('first_name', { ascending: true }).then(({ data }) => setStaff(data || []));
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase.from('errands').select('*').eq('id', id!).maybeSingle();
      if (error) toast.error(error.message);
      else if (data) {
        setForm({
          title: data.title || '',
          title_ar: data.title_ar || '',
          description: data.description || '',
          description_ar: data.description_ar || '',
          errand_type: data.errand_type || 'other',
          status: data.status || 'new',
          priority: data.priority || 'normal',
          due_date: data.due_date ? new Date(data.due_date) : undefined,
          case_id: data.case_id || '',
          assigned_to: data.assigned_to || '',
          is_visible_to_client: data.is_visible_to_client ?? false,
          billing_type: data.billing_type || 'fixed_fee',
          hourly_rate: data.hourly_rate?.toString() || '',
          fixed_fee_amount: data.fixed_fee_amount?.toString() || '',
          retainer_amount: data.retainer_amount?.toString() || '',
          contingency_percentage: data.contingency_percentage?.toString() || '',
          estimated_value: data.estimated_value?.toString() || '',
          estimated_value_currency: data.estimated_value_currency || 'IQD',
        });
        if (data.party_type === 'person' && data.person_id) {
          const { data: p } = await supabase.from('persons').select('first_name, first_name_ar, last_name, last_name_ar').eq('id', data.person_id).maybeSingle();
          setParty({ partyType: 'person', personId: data.person_id, displayName: `${p?.first_name || ''} ${p?.last_name || ''}`.trim() });
        } else if (data.party_type === 'entity' && data.entity_id) {
          const { data: e } = await supabase.from('entities').select('company_name').eq('id', data.entity_id).maybeSingle();
          setParty({ partyType: 'entity', entityId: data.entity_id, displayName: e?.company_name || '' });
        }
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(lang === 'ar' ? 'العنوان مطلوب' : 'Title is required');
      return;
    }
    if (!party) {
      toast.error(lang === 'ar' ? 'يجب اختيار موكل للمعاملة' : 'Select a client for this errand');
      return;
    }
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      if (party.partyType === 'entity' && party.entityId) {
        const { data: rep, error: repErr } = await supabase
          .from('entity_representatives')
          .select('id')
          .eq('entity_id', party.entityId)
          .or(`end_date.is.null,end_date.gte.${new Date().toISOString().slice(0, 10)}`)
          .limit(1)
          .maybeSingle();
        if (repErr) throw repErr;
        if (!rep) {
          toast.error(
            lang === 'ar'
              ? `لا يمكن إضافة ${party.displayName} كموكل دون ممثل بشري`
              : `${party.displayName} must have at least one human representative before it can be a client`,
          );
          return;
        }
      }

      const payload: any = {
        title: form.title,
        title_ar: form.title_ar || null,
        description: form.description || null,
        description_ar: form.description_ar || null,
        errand_type: form.errand_type,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date ? form.due_date.toISOString().slice(0, 10) : null,
        case_id: form.case_id || null,
        assigned_to: form.assigned_to || null,
        is_visible_to_client: true,
        party_type: party?.partyType || null,
        person_id: party?.partyType === 'person' ? party.personId : null,
        entity_id: party?.partyType === 'entity' ? party.entityId : null,
        billing_type: form.billing_type,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        fixed_fee_amount: form.fixed_fee_amount ? parseFloat(form.fixed_fee_amount) : null,
        retainer_amount: form.retainer_amount ? parseFloat(form.retainer_amount) : null,
        contingency_percentage: form.contingency_percentage ? parseFloat(form.contingency_percentage) : null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        estimated_value_currency: form.estimated_value_currency,
        organization_id: profile.organization_id,
      };
      if (isEdit) {
        const { error } = await supabase.from('errands').update(payload).eq('id', id!);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['errands'] });
        toast.success(lang === 'ar' ? 'تم الحفظ' : 'Saved');
        navigate(`/errands/${id}`);
      } else {
        payload.created_by = profile.id;
        payload.errand_number = '';
        const { data, error } = await supabase.rpc('create_errand_with_team' as any, { _errand: payload });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['errands'] });
        toast.success(lang === 'ar' ? 'تم الإنشاء' : 'Created');
        navigate(`/errands/${data}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit Errand' : 'New Errand'}
        titleAr={isEdit ? 'تعديل المعاملة' : 'معاملة جديدة'}
        breadcrumbs={[
          { label: 'Errands', labelAr: 'المعاملات', href: '/errands' },
          { label: isEdit ? 'Edit' : 'New', labelAr: isEdit ? 'تعديل' : 'جديد' },
        ]}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={lang === 'ar' ? 'العنوان' : 'Title'} required>
            <FormInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label={lang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}>
            <FormInput dir="rtl" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
          </FormField>
          <FormField label={lang === 'ar' ? 'النوع' : 'Type'} required>
            <FormSelect value={form.errand_type} onValueChange={(v) => setForm({ ...form, errand_type: v })}
              options={ERRAND_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label={lang === 'ar' ? 'الحالة' : 'Status'}>
            <FormSelect value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}
              options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label={lang === 'ar' ? 'الأولوية' : 'Priority'}>
            <FormSelect value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
          </FormField>
          <FormField label={lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due date'}>
            <FormDatePicker value={form.due_date} onChange={(d) => setForm({ ...form, due_date: d })} />
          </FormField>
          <FormField label={lang === 'ar' ? 'الموكّل' : 'Client / Party'} className="md:col-span-2">
            <PartySelector value={party} onChange={setParty} />
          </FormField>
          <FormField label={lang === 'ar' ? 'القضية المرتبطة' : 'Linked case'} className="md:col-span-2">
            <FormSelect
              value={form.case_id || '__none'}
              onValueChange={(v) => setForm({ ...form, case_id: v === '__none' ? '' : v })}
              options={[{ value: '__none', label: lang === 'ar' ? 'بدون' : 'None' }, ...cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.title}` }))]}
            />
          </FormField>
          <FormField label={lang === 'ar' ? 'المسؤول' : 'Assigned to'}>
            <FormSelect
              value={form.assigned_to || '__none'}
              onValueChange={(v) => setForm({ ...form, assigned_to: v === '__none' ? '' : v })}
              options={[
                { value: '__none', label: lang === 'ar' ? 'غير معيّن' : 'Unassigned' },
                ...staff.map((s) => ({
                  value: s.id,
                  label: `${s.first_name} ${s.last_name}${s.role ? ` (${s.role.replace(/_/g, ' ')})` : ''}`,
                })),
              ]}
            />
          </FormField>
          <FormField label={lang === 'ar' ? 'مشاركة مع العميل' : 'Share with client'}>
            <label className="flex items-center gap-3 h-10 px-3 rounded-input border border-border bg-card cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_visible_to_client}
                onChange={(e) => setForm({ ...form, is_visible_to_client: e.target.checked })}
                className="h-4 w-4 rounded accent-accent"
              />
              <span className="text-body-sm text-muted-foreground">
                {lang === 'ar'
                  ? (form.is_visible_to_client ? 'مرئي للعميل' : 'مخفي عن العميل')
                  : (form.is_visible_to_client ? 'Visible in client portal' : 'Hidden from client')}
              </span>
            </label>
          </FormField>
          <FormField label={lang === 'ar' ? 'الوصف' : 'Description'} className="md:col-span-2">
            <FormTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label={lang === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'} className="md:col-span-2">
            <FormTextarea dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
          </FormField>
        </div>

        <section className="space-y-4 pt-2">
          <h2 className="text-heading-md text-foreground">{lang === 'ar' ? 'الفوترة' : 'Billing'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={lang === 'ar' ? 'نوع الفوترة' : 'Billing type'}>
              <FormSelect
                value={form.billing_type}
                onValueChange={(v) => setForm({ ...form, billing_type: v })}
                options={BILLING_TYPES.map((type) => ({
                  value: type,
                  label: lang === 'ar'
                    ? ({
                        fixed_fee: 'أتعاب مقطوعة',
                        hourly: 'بالساعة',
                        retainer: 'دفعة مقدمة',
                        contingency: 'نسبة من النتيجة',
                        pro_bono: 'دون أتعاب',
                      } as Record<string, string>)[type]
                    : type.replace(/_/g, ' '),
                }))}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'عملة القيمة المقدرة' : 'Estimated value currency'}>
              <FormSelect
                value={form.estimated_value_currency}
                onValueChange={(v) => setForm({ ...form, estimated_value_currency: v })}
                options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
              />
            </FormField>
            {form.billing_type === 'hourly' && (
              <FormField label={lang === 'ar' ? 'سعر الساعة' : 'Hourly rate'}>
                <FormInput type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
              </FormField>
            )}
            {form.billing_type === 'fixed_fee' && (
              <FormField label={lang === 'ar' ? 'الأتعاب المقطوعة' : 'Fixed fee amount'}>
                <FormInput type="number" min="0" step="0.01" value={form.fixed_fee_amount} onChange={(e) => setForm({ ...form, fixed_fee_amount: e.target.value })} />
              </FormField>
            )}
            {form.billing_type === 'retainer' && (
              <FormField label={lang === 'ar' ? 'مبلغ الدفعة المقدمة' : 'Retainer amount'}>
                <FormInput type="number" min="0" step="0.01" value={form.retainer_amount} onChange={(e) => setForm({ ...form, retainer_amount: e.target.value })} />
              </FormField>
            )}
            {form.billing_type === 'contingency' && (
              <FormField label={lang === 'ar' ? 'النسبة المئوية' : 'Contingency percentage'}>
                <FormInput type="number" min="0" max="100" step="0.01" value={form.contingency_percentage} onChange={(e) => setForm({ ...form, contingency_percentage: e.target.value })} />
              </FormField>
            )}
            <FormField label={lang === 'ar' ? 'القيمة المقدرة' : 'Estimated value'}>
              <FormInput type="number" min="0" step="0.01" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
            </FormField>
          </div>
        </section>

        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/errands/${id}` : '/errands')}>
            <ArrowLeft size={14} /> {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? (lang === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (lang === 'ar' ? 'حفظ' : 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
