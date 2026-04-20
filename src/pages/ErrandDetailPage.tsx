import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { PartyChip } from '@/components/parties/PartyChip';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';

export default function ErrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const lang = language as 'en' | 'ar';
  const [newStep, setNewStep] = useState('');

  const { data: errand, isLoading } = useQuery({
    queryKey: ['errand', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('errands')
        .select('*, person:persons(first_name, first_name_ar, last_name, last_name_ar), entity:entities(company_name, company_name_ar)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: steps } = useQuery({
    queryKey: ['errand-steps', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('errand_steps').select('*').eq('errand_id', id!).order('step_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ['errand-notes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('errand_notes').select('*').eq('errand_id', id!).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const addStep = async () => {
    if (!newStep.trim() || !profile?.organization_id) return;
    const order = (steps?.length ?? 0) + 1;
    const { error } = await supabase.from('errand_steps').insert({
      errand_id: id!,
      organization_id: profile.organization_id,
      title: newStep,
      step_order: order,
    });
    if (error) toast.error(error.message);
    else {
      setNewStep('');
      qc.invalidateQueries({ queryKey: ['errand-steps', id] });
      qc.invalidateQueries({ queryKey: ['errand', id] });
    }
  };

  const toggleStep = async (stepId: string, current: string) => {
    const next = current === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('errand_steps')
      .update({ status: next, completed_at: next === 'completed' ? new Date().toISOString() : null, completed_by: next === 'completed' ? profile?.id : null })
      .eq('id', stepId);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ['errand-steps', id] });
      qc.invalidateQueries({ queryKey: ['errand', id] });
    }
  };

  const removeStep = async (stepId: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذه الخطوة؟' : 'Delete this step?')) return;
    const { error } = await supabase.from('errand_steps').delete().eq('id', stepId);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ['errand-steps', id] });
      qc.invalidateQueries({ queryKey: ['errand', id] });
    }
  };

  if (isLoading) return <PageLoader />;
  if (!errand) {
    return <EmptyState icon={ClipboardList} title="Errand not found" titleAr="المعاملة غير موجودة" />;
  }

  const title = lang === 'ar' && errand.title_ar ? errand.title_ar : errand.title;
  const partyName = errand.party_type === 'person'
    ? resolvePersonName(errand.person as any, lang)
    : errand.party_type === 'entity'
      ? resolveEntityName(errand.entity as any, lang)
      : '';
  const pct = errand.total_steps > 0 ? Math.round((errand.completed_steps / errand.total_steps) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/errands')} className="mb-4">
          <ArrowLeft size={14} /> {lang === 'ar' ? 'العودة' : 'Back'}
        </Button>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono text-muted-foreground">{errand.errand_number}</span>
              <StatusBadge status={errand.status} type="errand" size="sm" />
              <StatusBadge status={errand.priority === 'normal' ? 'medium' : errand.priority} type="priority" size="sm" />
            </div>
            <h1 className="text-display-lg text-foreground">{title}</h1>
            <p className="text-body-md text-muted-foreground mt-1 capitalize">{errand.errand_type?.replace(/_/g, ' ')}</p>
            {partyName && <div className="mt-3"><PartyChip partyType={errand.party_type as 'person' | 'entity'} displayName={partyName} /></div>}
          </div>
          <Button onClick={() => navigate(`/errands/${id}/edit`)}>
            <Pencil size={14} /> {lang === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
        </div>

        {errand.total_steps > 0 && (
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-body-sm mb-1">
              <span className="text-muted-foreground">{lang === 'ar' ? 'التقدم' : 'Progress'}</span>
              <span className="text-foreground font-medium">{errand.completed_steps}/{errand.total_steps} ({pct}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps"><CheckCircle2 size={14} className="me-1.5" /> {lang === 'ar' ? 'الخطوات' : 'Steps'}</TabsTrigger>
          <TabsTrigger value="overview"><FileText size={14} className="me-1.5" /> {lang === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="notes"><FileText size={14} className="me-1.5" /> {lang === 'ar' ? 'الملاحظات' : 'Notes'}</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="mt-6 space-y-4">
          <div className="rounded-card border border-border bg-card overflow-hidden">
            {(steps?.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-body-sm">{lang === 'ar' ? 'لا توجد خطوات بعد' : 'No steps yet'}</div>
            ) : (
              <div className="divide-y divide-border">
                {steps!.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3">
                    <button onClick={() => toggleStep(s.id, s.status)} className="shrink-0">
                      {s.status === 'completed' ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-body-md ${s.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {lang === 'ar' && s.title_ar ? s.title_ar : s.title}
                      </p>
                    </div>
                    <button onClick={() => removeStep(s.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStep()}
              placeholder={lang === 'ar' ? 'أضف خطوة جديدة…' : 'Add a new step…'}
              className="h-10"
            />
            <Button onClick={addStep} disabled={!newStep.trim()}>
              <Plus size={14} /> {lang === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="rounded-card border border-border bg-card p-5 space-y-3">
            <Row label={lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due date'} value={errand.due_date ? format(new Date(errand.due_date), 'PP') : null} />
            <Row label={lang === 'ar' ? 'القضية المرتبطة' : 'Linked case'} value={errand.case_id ? <Link to={`/cases/${errand.case_id}`} className="text-accent hover:underline">{lang === 'ar' ? 'عرض القضية' : 'View case'}</Link> : null} />
          </div>
          {(errand.description || errand.description_ar) && (
            <div className="rounded-card border border-border bg-card p-5">
              <h3 className="text-heading-sm text-foreground mb-2">{lang === 'ar' ? 'الوصف' : 'Description'}</h3>
              <p className="text-body-md text-foreground whitespace-pre-wrap">{lang === 'ar' && errand.description_ar ? errand.description_ar : errand.description}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          {(notes?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState icon={FileText} title="No notes yet" titleAr="لا توجد ملاحظات" size="sm" />
            </div>
          ) : (
            <div className="space-y-3">
              {notes!.map((n) => (
                <div key={n.id} className="rounded-card border border-border bg-card p-4">
                  <p className="text-body-md text-foreground whitespace-pre-wrap">{lang === 'ar' && n.content_ar ? n.content_ar : n.content}</p>
                  <p className="text-body-sm text-muted-foreground mt-2">{format(new Date(n.created_at), 'PPp')}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-body-sm text-foreground">{value}</span>
    </div>
  );
}
