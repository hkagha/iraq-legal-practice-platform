import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
const STATUSES = ['new', 'in_progress', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government', 'additional_requirements', 'approved', 'rejected', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function ErrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [party, setParty] = useState<PartyRef | null>(null);
  const [cases, setCases] = useState<{ id: string; case_number: string; title: string }[]>([]);

  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    errand_type: 'other',
    status: 'new',
    priority: 'normal',
    due_date: undefined as Date | undefined,
    case_id: '',
  });

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('cases').select('id, case_number, title').eq('organization_id', profile.organization_id).order('updated_at', { ascending: false }).limit(200).then(({ data }) => setCases(data || []));
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
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
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
        party_type: party?.partyType || null,
        person_id: party?.partyType === 'person' ? party.personId : null,
        entity_id: party?.partyType === 'entity' ? party.entityId : null,
        organization_id: profile.organization_id,
      };
      if (isEdit) {
        const { error } = await supabase.from('errands').update(payload).eq('id', id!);
        if (error) throw error;
        toast.success(lang === 'ar' ? 'تم الحفظ' : 'Saved');
        navigate(`/errands/${id}`);
      } else {
        payload.created_by = profile.id;
        payload.errand_number = '';
        const { data, error } = await supabase.from('errands').insert(payload).select('id').single();
        if (error) throw error;
        toast.success(lang === 'ar' ? 'تم الإنشاء' : 'Created');
        navigate(`/errands/${data!.id}`);
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
          <FormField label={lang === 'ar' ? 'الوصف' : 'Description'} className="md:col-span-2">
            <FormTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label={lang === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'} className="md:col-span-2">
            <FormTextarea dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
          </FormField>
        </div>

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
