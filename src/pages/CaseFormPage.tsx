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
import { CasePartiesEditor } from '@/components/parties/CasePartiesEditor';
import { PartySelector } from '@/components/parties/PartySelector';
import { PartyChip } from '@/components/parties/PartyChip';
import { PageLoader } from '@/components/ui/PageLoader';
import { CASE_PARTY_ROLES, type PartyRef } from '@/types/parties';
import PersonFormSlideOver from '@/components/parties/PersonFormSlideOver';
import EntityFormSlideOver from '@/components/parties/EntityFormSlideOver';
import { Star, Trash2, Plus } from 'lucide-react';
import { runConflictCheck, saveConflictCheck, type ConflictMatch } from '@/lib/conflictChecker';

interface DraftParty {
  ref: PartyRef;
  role: string;
  is_primary: boolean;
}

function roleLabel(r: string, lang: 'en' | 'ar'): string {
  const map: Record<string, [string, string]> = {
    client: ['Client', 'موكل'],
    opposing_party: ['Opposing party', 'الطرف الآخر'],
    co_counsel: ['Co-counsel', 'محامٍ مشارك'],
    witness: ['Witness', 'شاهد'],
    expert: ['Expert', 'خبير'],
    third_party: ['Third party', 'طرف ثالث'],
    plaintiff: ['Plaintiff', 'مدّعٍ'],
    defendant: ['Defendant', 'مدّعى عليه'],
  };
  return (map[r]?.[lang === 'ar' ? 1 : 0]) || r;
}

const CASE_TYPES = ['civil', 'criminal', 'commercial', 'family', 'labor', 'administrative', 'real_estate', 'other'];
const STATUSES = ['intake', 'pending_conflict_review', 'active', 'on_hold', 'pending_judgment', 'appeal', 'enforcement', 'closed', 'archived'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const COURT_TYPES = ['personal_status', 'civil', 'criminal', 'commercial', 'administrative', 'cassation', 'appeal', 'other'];

export default function CaseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const lang = language as 'en' | 'ar';
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Draft parties (only used when creating a new case)
  const [draftParties, setDraftParties] = useState<DraftParty[]>([]);
  const [draftRef, setDraftRef] = useState<PartyRef | null>(null);
  const [draftRole, setDraftRole] = useState<string>('client');
  const [showPerson, setShowPerson] = useState(false);
  const [showEntity, setShowEntity] = useState(false);

  const roleOptions = CASE_PARTY_ROLES.map((r) => ({
    value: r,
    label: roleLabel(r, lang),
  }));

  const addDraftParty = () => {
    if (!draftRef) return;
    const exists = draftParties.some(
      (p) =>
        p.ref.partyType === draftRef.partyType &&
        ((p.ref.personId && p.ref.personId === draftRef.personId) ||
          (p.ref.entityId && p.ref.entityId === draftRef.entityId)),
    );
    if (exists) {
      toast.error(lang === 'ar' ? 'هذا الطرف مضاف بالفعل' : 'Party already added');
      return;
    }
    setDraftParties((prev) => [
      ...prev,
      { ref: draftRef, role: draftRole, is_primary: prev.length === 0 },
    ]);
    setDraftRef(null);
    setDraftRole('client');
  };

  const removeDraftParty = (idx: number) => {
    setDraftParties((prev) => prev.filter((_, i) => i !== idx));
  };
  const setDraftPrimary = (idx: number) => {
    setDraftParties((prev) => prev.map((p, i) => ({ ...p, is_primary: i === idx })));
  };
  const setDraftPartyRole = (idx: number, role: string) => {
    setDraftParties((prev) => prev.map((p, i) => (i === idx ? { ...p, role } : p)));
  };

  const buildConflictInput = async (party: DraftParty) => {
    const base = {
      organization_id: profile!.organization_id!,
      query_name: party.ref.displayName,
    };

    if (party.ref.partyType === 'person' && party.ref.personId) {
      const { data, error } = await supabase
        .from('persons')
        .select('first_name, last_name, first_name_ar, last_name_ar, phone, secondary_phone, email, national_id_number')
        .eq('id', party.ref.personId)
        .maybeSingle();
      if (error) throw error;

      const storedName = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim();
      const storedArabicName = [data?.first_name_ar, data?.last_name_ar].filter(Boolean).join(' ').trim();

      return {
        ...base,
        query_name: storedName || storedArabicName || party.ref.displayName,
        query_phone: data?.phone || data?.secondary_phone || undefined,
        query_email: data?.email || undefined,
        query_national_id: data?.national_id_number || undefined,
      };
    }

    if (party.ref.partyType === 'entity' && party.ref.entityId) {
      const { data, error } = await supabase
        .from('entities')
        .select('company_name, company_name_ar, phone, email, tax_id, company_registration_number')
        .eq('id', party.ref.entityId)
        .maybeSingle();
      if (error) throw error;

      return {
        ...base,
        query_name: data?.company_name || data?.company_name_ar || party.ref.displayName,
        query_phone: data?.phone || undefined,
        query_email: data?.email || undefined,
        query_tax_id: data?.tax_id || undefined,
        query_company_registration_number: data?.company_registration_number || undefined,
      };
    }

    return base;
  };

  const findClientConflicts = async (clientParties: DraftParty[]): Promise<ConflictMatch[]> => {
    const matches: ConflictMatch[] = [];
    const seen = new Set<string>();

    for (const party of clientParties) {
      const result = await runConflictCheck(await buildConflictInput(party));
      for (const match of result.matches) {
        const key = `${match.type}:${match.id}:${match.match_reason}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push(match);
      }
    }

    return matches;
  };

  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    case_type: 'civil',
    status: 'intake',
    priority: 'medium',
    court_name: '',
    court_name_ar: '',
    court_type: '',
    court_case_number: '',
    judge_name: '',
    judge_name_ar: '',
    filing_date: undefined as Date | undefined,
    estimated_value: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data, error } = await supabase.from('cases').select('*').eq('id', id!).maybeSingle();
      if (error) toast.error(error.message);
      else if (data) {
        setForm({
          title: data.title || '',
          title_ar: data.title_ar || '',
          description: data.description || '',
          description_ar: data.description_ar || '',
          case_type: data.case_type || 'civil',
          status: data.status || 'intake',
          priority: data.priority || 'medium',
          court_name: data.court_name || '',
          court_name_ar: data.court_name_ar || '',
          court_type: data.court_type || '',
          court_case_number: data.court_case_number || '',
          judge_name: data.judge_name || '',
          judge_name_ar: data.judge_name_ar || '',
          filing_date: data.filing_date ? new Date(data.filing_date) : undefined,
          estimated_value: data.estimated_value?.toString() || '',
        });
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error(lang === 'ar' ? 'العنوان مطلوب' : 'Title is required');
      return;
    }
    if (!isEdit && !draftParties.some((p) => p.role === 'client')) {
      toast.error(lang === 'ar' ? 'يجب إضافة موكل واحد على الأقل' : 'Add at least one client party');
      return;
    }
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      const entityClientIds = draftParties
        .filter((p) => p.role === 'client' && p.ref.partyType === 'entity' && p.ref.entityId)
        .map((p) => p.ref.entityId!);
      if (!isEdit && entityClientIds.length > 0) {
        const { data: reps, error: repsErr } = await supabase
          .from('entity_representatives')
          .select('entity_id')
          .in('entity_id', entityClientIds)
          .or(`end_date.is.null,end_date.gte.${new Date().toISOString().slice(0, 10)}`);
        if (repsErr) throw repsErr;
        const represented = new Set((reps || []).map((r: any) => r.entity_id));
        const missing = draftParties.find(
          (p) => p.role === 'client' && p.ref.partyType === 'entity' && p.ref.entityId && !represented.has(p.ref.entityId),
        );
        if (missing) {
          toast.error(
            lang === 'ar'
              ? `لا يمكن إضافة ${missing.ref.displayName} كموكل دون ممثل بشري`
              : `${missing.ref.displayName} must have at least one human representative before it can be a client`,
          );
          return;
        }
      }

      const payload: any = {
        title: form.title,
        title_ar: form.title_ar || null,
        description: form.description || null,
        description_ar: form.description_ar || null,
        case_type: form.case_type,
        status: form.status,
        priority: form.priority,
        court_name: form.court_name || null,
        court_name_ar: form.court_name_ar || null,
        court_type: form.court_type || null,
        court_case_number: form.court_case_number || null,
        judge_name: form.judge_name || null,
        judge_name_ar: form.judge_name_ar || null,
        filing_date: form.filing_date ? form.filing_date.toISOString().slice(0, 10) : null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        organization_id: profile.organization_id,
      };
      if (isEdit) {
        payload.updated_by = profile.id;
        const { error } = await supabase.from('cases').update(payload).eq('id', id!);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ['cases'] });
        toast.success(lang === 'ar' ? 'تم الحفظ' : 'Saved');
        navigate(`/cases/${id}`);
      } else {
        const clientParties = draftParties.filter((p) => p.role === 'client');
        const conflictMatches = await findClientConflicts(clientParties);
        if (conflictMatches.length > 0) {
          payload.status = 'pending_conflict_review';
        }

        payload.created_by = profile.id;
        payload.is_visible_to_client = true;
        // case_number is auto-generated by trigger; pass placeholder
        payload.case_number = 'PENDING';
        const partyRows = draftParties.map((p) => ({
          party_type: p.ref.partyType,
          person_id: p.ref.personId || null,
          entity_id: p.ref.entityId || null,
          role: p.role,
          is_primary: p.is_primary,
        }));
        const { data: newCaseId, error } = await supabase.rpc('create_case_with_parties' as any, {
          _case: payload,
          _parties: partyRows,
        });
        if (error) throw error;

        if (conflictMatches.length > 0) {
          for (const client of clientParties) {
            await saveConflictCheck({
              organization_id: profile.organization_id!,
              checked_by: profile.id,
              query_name: client.ref.displayName,
              query_type: client.ref.partyType,
              results: conflictMatches,
              notes: 'Automatic case intake conflict check',
              case_id: newCaseId as string,
            });
          }
          toast.warning(
            lang === 'ar'
              ? 'تم إنشاء القضية بحالة انتظار مراجعة تعارض المصالح'
              : 'Case created pending conflict review',
          );
        }

        qc.invalidateQueries({ queryKey: ['cases'] });
        if (conflictMatches.length === 0) {
          toast.success(lang === 'ar' ? 'تم إنشاء القضية' : 'Case created');
        }
        navigate(`/cases/${newCaseId}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={isEdit ? 'Edit Case' : 'New Case'}
        titleAr={isEdit ? 'تعديل القضية' : 'قضية جديدة'}
        breadcrumbs={[
          { label: 'Cases', labelAr: 'القضايا', href: '/cases' },
          { label: isEdit ? 'Edit' : 'New', labelAr: isEdit ? 'تعديل' : 'جديد' },
        ]}
      />

      <div className="space-y-8">
        {/* Basic info */}
        <section className="space-y-4">
          <h2 className="text-heading-md text-foreground">{lang === 'ar' ? 'المعلومات الأساسية' : 'Basic information'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={lang === 'ar' ? 'العنوان' : 'Title'} required>
              <FormInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}>
              <FormInput dir="rtl" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'النوع' : 'Case type'} required>
              <FormSelect
                value={form.case_type}
                onValueChange={(v) => setForm({ ...form, case_type: v })}
                options={CASE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'الحالة' : 'Status'}>
              <FormSelect
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
                options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'الأولوية' : 'Priority'}>
              <FormSelect
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
                options={PRIORITIES.map((p) => ({ value: p, label: p }))}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'تاريخ الإيداع' : 'Filing date'}>
              <FormDatePicker value={form.filing_date} onChange={(d) => setForm({ ...form, filing_date: d })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'الوصف' : 'Description'} className="md:col-span-2">
              <FormTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'} className="md:col-span-2">
              <FormTextarea dir="rtl" value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} />
            </FormField>
          </div>
        </section>

        {/* Court info */}
        <section className="space-y-4">
          <h2 className="text-heading-md text-foreground">{lang === 'ar' ? 'معلومات المحكمة' : 'Court information'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={lang === 'ar' ? 'نوع المحكمة' : 'Court type'}>
              <FormSelect
                value={form.court_type}
                onValueChange={(v) => setForm({ ...form, court_type: v })}
                options={COURT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
              />
            </FormField>
            <FormField label={lang === 'ar' ? 'رقم القضية في المحكمة' : 'Court case number'}>
              <FormInput value={form.court_case_number} onChange={(e) => setForm({ ...form, court_case_number: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'اسم المحكمة' : 'Court name'}>
              <FormInput value={form.court_name} onChange={(e) => setForm({ ...form, court_name: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'اسم المحكمة (عربي)' : 'Court name (Arabic)'}>
              <FormInput dir="rtl" value={form.court_name_ar} onChange={(e) => setForm({ ...form, court_name_ar: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'القاضي' : 'Judge name'}>
              <FormInput value={form.judge_name} onChange={(e) => setForm({ ...form, judge_name: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'القاضي (عربي)' : 'Judge name (Arabic)'}>
              <FormInput dir="rtl" value={form.judge_name_ar} onChange={(e) => setForm({ ...form, judge_name_ar: e.target.value })} />
            </FormField>
            <FormField label={lang === 'ar' ? 'القيمة المقدّرة (د.ع)' : 'Estimated value (IQD)'}>
              <FormInput type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
            </FormField>
          </div>
        </section>

        {/* Parties */}
        <section className="space-y-4">
          <div>
            <h2 className="text-heading-md text-foreground">{lang === 'ar' ? 'الأطراف' : 'Parties'}</h2>
            <p className="text-body-sm text-muted-foreground mt-1">
              {lang === 'ar'
                ? 'أضف الموكل والأطراف الأخرى المرتبطة بالقضية.'
                : 'Add the client and other parties related to this case.'}
            </p>
          </div>

          {isEdit && profile?.organization_id ? (
            <CasePartiesEditor caseId={id!} organizationId={profile.organization_id} />
          ) : (
            <div className="space-y-4">
              {/* Existing draft parties */}
              <div className="border border-border rounded-card overflow-hidden">
                {draftParties.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-body-sm">
                    {lang === 'ar' ? 'لا أطراف مضافة بعد' : 'No parties added yet'}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {draftParties.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <PartyChip
                            partyType={p.ref.partyType}
                            displayName={p.ref.displayName}
                            showTypeBadge
                          />
                        </div>
                        <div className="w-[160px] shrink-0">
                          <FormSelect
                            value={p.role}
                            onValueChange={(v) => setDraftPartyRole(idx, v)}
                            options={roleOptions}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftPrimary(idx)}
                          className={`p-2 rounded-button ${p.is_primary ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                          title={lang === 'ar' ? 'الطرف الأساسي' : 'Set primary'}
                        >
                          <Star size={16} fill={p.is_primary ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDraftParty(idx)}
                          className="p-2 rounded-button text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add party form */}
              <div className="border border-border rounded-card p-3 space-y-3 bg-muted/20">
                <p className="text-label text-muted-foreground">
                  {lang === 'ar' ? 'إضافة طرف' : 'Add party'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
                  <PartySelector
                    value={draftRef}
                    onChange={setDraftRef}
                    onCreatePerson={() => setShowPerson(true)}
                    onCreateEntity={() => setShowEntity(true)}
                  />
                  <FormSelect value={draftRole} onValueChange={setDraftRole} options={roleOptions} />
                  <Button onClick={addDraftParty} disabled={!draftRef}>
                    <Plus size={14} />
                    {lang === 'ar' ? 'إضافة' : 'Add'}
                  </Button>
                </div>
              </div>

              <PersonFormSlideOver
                isOpen={showPerson}
                onClose={() => setShowPerson(false)}
                onSaved={(ref) => setDraftRef(ref)}
              />
              <EntityFormSlideOver
                isOpen={showEntity}
                onClose={() => setShowEntity(false)}
                onSaved={(ref) => setDraftRef(ref)}
              />
            </div>
          )}
        </section>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/cases/${id}` : '/cases')}>
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
