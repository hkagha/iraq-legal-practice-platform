import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, Calendar, FileText, Gavel, Pencil, Scale, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CasePartiesEditor } from '@/components/parties/CasePartiesEditor';
import { PageLoader } from '@/components/ui/PageLoader';
import { format } from 'date-fns';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const lang = language as 'en' | 'ar';

  const { data: caseRow, isLoading } = useQuery({
    queryKey: ['case', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('cases').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: hearings } = useQuery({
    queryKey: ['case-hearings', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_hearings')
        .select('*')
        .eq('case_id', id!)
        .order('hearing_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ['case-notes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_notes')
        .select('*')
        .eq('case_id', id!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const title = useMemo(() => {
    if (!caseRow) return '';
    return lang === 'ar' && caseRow.title_ar ? caseRow.title_ar : caseRow.title;
  }, [caseRow, lang]);

  if (isLoading) return <PageLoader />;
  if (!caseRow) {
    return (
      <div>
        <PageHeader title="Not found" titleAr="غير موجود" />
        <EmptyState icon={Briefcase} title="Case not found" titleAr="القضية غير موجودة" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="mb-4">
          <ArrowLeft size={14} /> {lang === 'ar' ? 'العودة إلى القضايا' : 'Back to cases'}
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono text-muted-foreground">{caseRow.case_number}</span>
              <StatusBadge status={caseRow.status} type="case" size="sm" />
              <StatusBadge status={caseRow.priority} type="priority" size="sm" />
            </div>
            <h1 className="text-display-lg text-foreground">{title}</h1>
            {caseRow.case_type && (
              <p className="text-body-md text-muted-foreground mt-1 capitalize">{caseRow.case_type.replace(/_/g, ' ')}</p>
            )}
          </div>
          <Button onClick={() => navigate(`/cases/${id}/edit`)}>
            <Pencil size={14} /> {lang === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><FileText size={14} className="me-1.5" /> {lang === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="parties"><Users size={14} className="me-1.5" /> {lang === 'ar' ? 'الأطراف' : 'Parties'}</TabsTrigger>
          <TabsTrigger value="hearings"><Gavel size={14} className="me-1.5" /> {lang === 'ar' ? 'الجلسات' : 'Hearings'}</TabsTrigger>
          <TabsTrigger value="notes"><FileText size={14} className="me-1.5" /> {lang === 'ar' ? 'الملاحظات' : 'Notes'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title={lang === 'ar' ? 'المحكمة' : 'Court'} icon={Scale}>
              <Row label={lang === 'ar' ? 'النوع' : 'Type'} value={caseRow.court_type} />
              <Row label={lang === 'ar' ? 'الاسم' : 'Name'} value={lang === 'ar' && caseRow.court_name_ar ? caseRow.court_name_ar : caseRow.court_name} />
              <Row label={lang === 'ar' ? 'رقم المحكمة' : 'Court number'} value={caseRow.court_case_number} />
              <Row label={lang === 'ar' ? 'القاضي' : 'Judge'} value={lang === 'ar' && caseRow.judge_name_ar ? caseRow.judge_name_ar : caseRow.judge_name} />
            </InfoCard>
            <InfoCard title={lang === 'ar' ? 'التواريخ' : 'Dates'} icon={Calendar}>
              <Row label={lang === 'ar' ? 'تاريخ الإيداع' : 'Filing date'} value={caseRow.filing_date ? format(new Date(caseRow.filing_date), 'PP') : null} />
              <Row label={lang === 'ar' ? 'القيمة المقدّرة' : 'Estimated value'} value={caseRow.estimated_value?.toLocaleString() ?? null} />
            </InfoCard>
          </div>
          {(caseRow.description || caseRow.description_ar) && (
            <InfoCard title={lang === 'ar' ? 'الوصف' : 'Description'} icon={FileText}>
              <p className="text-body-md text-foreground whitespace-pre-wrap">
                {lang === 'ar' && caseRow.description_ar ? caseRow.description_ar : caseRow.description}
              </p>
            </InfoCard>
          )}
        </TabsContent>

        <TabsContent value="parties" className="mt-6">
          {profile?.organization_id && <CasePartiesEditor caseId={id!} organizationId={profile.organization_id} />}
        </TabsContent>

        <TabsContent value="hearings" className="mt-6">
          {(hearings?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState icon={Gavel} title="No hearings yet" titleAr="لا توجد جلسات" size="sm" />
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card divide-y divide-border">
              {hearings!.map((h) => (
                <div key={h.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-body-md font-medium">{format(new Date(h.hearing_date), 'PP')} {h.hearing_time && `· ${h.hearing_time}`}</p>
                    <p className="text-body-sm text-muted-foreground capitalize">{h.hearing_type?.replace(/_/g, ' ')}</p>
                  </div>
                  <StatusBadge status={h.status} type="custom" customColor="#64748B" size="sm" />
                </div>
              ))}
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

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-muted-foreground" />
        <h3 className="text-heading-sm text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-body-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-body-sm text-foreground text-end truncate">{value}</span>
    </div>
  );
}
