import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/FormSelect';
import { Plus, Star, Trash2 } from 'lucide-react';
import { PartySelector } from './PartySelector';
import { PartyChip } from './PartyChip';
import { CASE_PARTY_ROLES } from '@/types/parties';
import type { CasePartyRow, PartyRef, PersonRow, EntityRow } from '@/types/parties';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';
import PersonFormSlideOver from './PersonFormSlideOver';
import EntityFormSlideOver from './EntityFormSlideOver';

interface Props {
  caseId: string;
  organizationId: string;
}

interface PopulatedRow extends CasePartyRow {
  person?: PersonRow | null;
  entity?: EntityRow | null;
}

export function CasePartiesEditor({ caseId, organizationId }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<PopulatedRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-form state
  const [pickedRef, setPickedRef] = useState<PartyRef | null>(null);
  const [pickedRole, setPickedRole] = useState<string>('client');
  const [adding, setAdding] = useState(false);

  // Inline create slide-overs
  const [showPerson, setShowPerson] = useState(false);
  const [showEntity, setShowEntity] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('case_parties')
      .select('*, person:persons!case_parties_person_id_fkey(*), entity:entities(*)')
      .eq('case_id', caseId);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data || []) as unknown as PopulatedRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [caseId]);

  const handleAdd = async () => {
    if (!pickedRef) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('case_parties').insert({
        case_id: caseId,
        organization_id: organizationId,
        party_type: pickedRef.partyType,
        person_id: pickedRef.personId || null,
        entity_id: pickedRef.entityId || null,
        role: pickedRole,
        is_primary: false,
      });
      if (error) throw error;
      toast.success(language === 'ar' ? 'تمت الإضافة' : 'Party added');
      setPickedRef(null);
      setPickedRole('client');
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(language === 'ar' ? 'إزالة هذا الطرف؟' : 'Remove this party?')) return;
    const { error } = await supabase.from('case_parties').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(language === 'ar' ? 'تمت الإزالة' : 'Removed');
      void load();
    }
  };

  const handleSetPrimary = async (id: string) => {
    // Clear other primaries on this case, set this one
    await supabase.from('case_parties').update({ is_primary: false }).eq('case_id', caseId);
    const { error } = await supabase.from('case_parties').update({ is_primary: true }).eq('id', id);
    if (error) toast.error(error.message);
    else void load();
  };

  const handleRoleChange = async (id: string, role: string) => {
    const { error } = await supabase.from('case_parties').update({ role }).eq('id', id);
    if (error) toast.error(error.message);
    else void load();
  };

  const roleOptions = CASE_PARTY_ROLES.map((r) => ({
    value: r,
    label: roleLabel(r, language as 'en' | 'ar'),
  }));

  return (
    <div className="space-y-4">
      {/* Existing parties */}
      <div className="border border-border rounded-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">{language === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-body-sm">
            {language === 'ar' ? 'لا أطراف مرتبطة' : 'No parties yet'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const name =
                r.party_type === 'person'
                  ? resolvePersonName(r.person ?? null, language as 'en' | 'ar')
                  : resolveEntityName(r.entity ?? null, language as 'en' | 'ar');
              return (
                <div key={r.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <PartyChip
                      partyType={r.party_type}
                      displayName={name}
                      id={r.party_type === 'person' ? r.person_id! : r.entity_id!}
                    />
                  </div>
                  <div className="w-[160px] shrink-0">
                    <FormSelect
                      value={r.role}
                      onValueChange={(v) => handleRoleChange(r.id, v)}
                      options={roleOptions}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(r.id)}
                    className={`p-2 rounded-button ${r.is_primary ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                    title={language === 'ar' ? 'الطرف الأساسي' : 'Set primary'}
                  >
                    <Star size={16} fill={r.is_primary ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(r.id)}
                    className="p-2 rounded-button text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="border border-border rounded-card p-3 space-y-3 bg-muted/20">
        <p className="text-label text-muted-foreground">{language === 'ar' ? 'إضافة طرف' : 'Add party'}</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
          <PartySelector
            value={pickedRef}
            onChange={setPickedRef}
            onCreatePerson={() => setShowPerson(true)}
            onCreateEntity={() => setShowEntity(true)}
          />
          <FormSelect value={pickedRole} onValueChange={setPickedRole} options={roleOptions} />
          <Button onClick={handleAdd} disabled={!pickedRef || adding}>
            <Plus size={14} />
            {language === 'ar' ? 'إضافة' : 'Add'}
          </Button>
        </div>
      </div>

      <PersonFormSlideOver
        isOpen={showPerson}
        onClose={() => setShowPerson(false)}
        onSaved={(ref) => setPickedRef(ref)}
      />
      <EntityFormSlideOver
        isOpen={showEntity}
        onClose={() => setShowEntity(false)}
        onSaved={(ref) => setPickedRef(ref)}
      />
    </div>
  );
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
