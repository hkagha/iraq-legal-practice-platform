import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { KeyRound, Plus, Star, Trash2 } from 'lucide-react';
import { PartySelector } from './PartySelector';
import { PartyChip } from './PartyChip';
import { resolvePersonName } from '@/lib/parties';
import type { EntityRepresentativeRow, PartyRef, PersonRow } from '@/types/parties';
import PersonFormSlideOver from './PersonFormSlideOver';

interface Props {
  entityId: string;
  organizationId: string;
  onCreatePortalLogin?: (personId: string) => void;
}

interface PopulatedRep extends EntityRepresentativeRow {
  person: PersonRow | null;
}

export function EntityRepresentativesEditor({ entityId, organizationId, onCreatePortalLogin }: Props) {
  const { language } = useLanguage();
  const [rows, setRows] = useState<PopulatedRep[]>([]);
  const [loading, setLoading] = useState(true);

  const [pickedRef, setPickedRef] = useState<PartyRef | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showPerson, setShowPerson] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('entity_representatives')
      .select('*, person:persons(*)')
      .eq('entity_id', entityId)
      .order('is_primary', { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data || []) as unknown as PopulatedRep[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [entityId]);

  const handleAdd = async () => {
    if (!pickedRef?.personId) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('entity_representatives').insert({
        entity_id: entityId,
        person_id: pickedRef.personId,
        organization_id: organizationId,
        job_title: jobTitle || null,
        role: 'contact',
        is_primary: rows.length === 0, // first rep is primary by default
      });
      if (error) throw error;
      toast.success(language === 'ar' ? 'تمت الإضافة' : 'Representative added');
      setPickedRef(null);
      setJobTitle('');
      void load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(language === 'ar' ? 'إزالة هذا الممثل؟' : 'Remove this representative?')) return;
    const { error } = await supabase.from('entity_representatives').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(language === 'ar' ? 'تمت الإزالة' : 'Removed');
      void load();
    }
  };

  const handleSetPrimary = async (id: string) => {
    await supabase.from('entity_representatives').update({ is_primary: false }).eq('entity_id', entityId);
    const { error } = await supabase.from('entity_representatives').update({ is_primary: true }).eq('id', id);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">{language === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-body-sm">
            {language === 'ar' ? 'لا ممثلين مرتبطين' : 'No representatives yet'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <PartyChip
                    partyType="person"
                    displayName={resolvePersonName(r.person, language as 'en' | 'ar')}
                    id={r.person_id}
                    showTypeBadge={false}
                  />
                  {r.job_title && (
                    <p className="text-body-sm text-muted-foreground mt-0.5 ms-10">
                      {language === 'ar' && r.job_title_ar ? r.job_title_ar : r.job_title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {onCreatePortalLogin && (
                    <button
                      type="button"
                      onClick={() => onCreatePortalLogin(r.person_id)}
                      className="p-2 rounded-button text-muted-foreground hover:text-accent"
                      title={language === 'ar' ? 'إنشاء دخول للبوابة' : 'Create portal login'}
                    >
                      <KeyRound size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(r.id)}
                    className={`p-2 rounded-button ${r.is_primary ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                    title={language === 'ar' ? 'الممثل الأساسي' : 'Set primary'}
                  >
                    <Star size={16} fill={r.is_primary ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(r.id)}
                  className="p-2 rounded-button text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-border rounded-card p-3 space-y-3 bg-muted/20">
        <p className="text-label text-muted-foreground">{language === 'ar' ? 'إضافة ممثل' : 'Add representative'}</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-2">
          <PartySelector
            value={pickedRef}
            onChange={setPickedRef}
            allowedTypes={['person']}
            onCreatePerson={() => setShowPerson(true)}
            placeholder="Pick a person…"
            placeholderAr="اختر شخصًا…"
          />
          <FormInput
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder={language === 'ar' ? 'المسمى الوظيفي' : 'Job title'}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          />
          <Button onClick={handleAdd} disabled={!pickedRef?.personId || adding}>
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
    </div>
  );
}
