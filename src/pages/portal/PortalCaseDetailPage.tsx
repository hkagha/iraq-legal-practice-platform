import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Scale, Calendar, Building2, Gavel, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, isRTL } = useLanguage();
  const isEN = language === 'en';

  const { data: caseRow, isLoading } = useQuery({
    queryKey: ['portal-case', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id!)
        .eq('is_visible_to_client', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: hearings } = useQuery({
    queryKey: ['portal-case-hearings', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_hearings')
        .select('id, hearing_date, hearing_time, hearing_type, status, court_room, notes, notes_ar, outcome, outcome_ar')
        .eq('case_id', id!)
        .eq('is_visible_to_client', true)
        .order('hearing_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: documents } = useQuery({
    queryKey: ['portal-case-documents', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, title, title_ar, file_type, file_size_bytes, created_at')
        .eq('case_id', id!)
        .eq('is_visible_to_client', true)
        .eq('status', 'active')
        .eq('is_latest_version', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <PageLoader />;

  if (!caseRow) {
    return (
      <div className="max-w-[1100px] mx-auto p-4 md:p-6">
        <EmptyState
          icon={Scale}
          title="Case not available"
          titleAr="القضية غير متاحة"
          subtitle="This case is not shared with you, or it does not exist."
          subtitleAr="هذه القضية غير مشاركة معك أو غير موجودة."
        />
      </div>
    );
  }

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(isEN ? 'en-GB' : 'ar-IQ') : '—';

  return (
    <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
      <Link
        to="/portal/cases"
        className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-accent transition-colors"
      >
        <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
        {isEN ? 'Back to cases' : 'العودة إلى القضايا'}
      </Link>

      {/* Header */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Scale className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-body-sm text-muted-foreground">{caseRow.case_number}</span>
              <StatusBadge status={caseRow.status} type="case" />
            </div>
            <h1 className="text-display-sm font-bold text-primary mb-1">
              {isEN ? caseRow.title : (caseRow.title_ar || caseRow.title)}
            </h1>
            {(caseRow.description || caseRow.description_ar) && (
              <p className="text-body-sm text-muted-foreground mt-2">
                {isEN ? caseRow.description : (caseRow.description_ar || caseRow.description)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Court info */}
      <Card className="p-5">
        <h2 className="text-body-md font-semibold text-foreground mb-3">
          {isEN ? 'Court information' : 'معلومات المحكمة'}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <dt className="text-muted-foreground text-body-xs">{isEN ? 'Court' : 'المحكمة'}</dt>
              <dd className="text-foreground">
                {caseRow.court_name
                  ? (isEN ? caseRow.court_name : (caseRow.court_name_ar || caseRow.court_name))
                  : '—'}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Gavel className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <dt className="text-muted-foreground text-body-xs">{isEN ? 'Judge' : 'القاضي'}</dt>
              <dd className="text-foreground">
                {caseRow.judge_name
                  ? (isEN ? caseRow.judge_name : (caseRow.judge_name_ar || caseRow.judge_name))
                  : '—'}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <dt className="text-muted-foreground text-body-xs">{isEN ? 'Filing date' : 'تاريخ الإيداع'}</dt>
              <dd className="text-foreground">{fmtDate(caseRow.filing_date)}</dd>
            </div>
          </div>
          {caseRow.court_case_number && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-body-xs">{isEN ? 'Court case #' : 'رقم القضية بالمحكمة'}</dt>
                <dd className="text-foreground font-mono">{caseRow.court_case_number}</dd>
              </div>
            </div>
          )}
        </dl>
      </Card>

      {/* Hearings */}
      <Card className="p-5">
        <h2 className="text-body-md font-semibold text-foreground mb-3">
          {isEN ? 'Hearings' : 'الجلسات'}
        </h2>
        {(hearings ?? []).length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            {isEN ? 'No hearings scheduled.' : 'لا توجد جلسات مجدولة.'}
          </p>
        ) : (
          <div className="space-y-2">
            {hearings!.map((h) => (
              <div key={h.id} className="border border-border rounded-lg p-3 flex items-start gap-3">
                <div className="h-9 w-9 rounded bg-secondary flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{fmtDate(h.hearing_date)}</span>
                    {h.hearing_time && <span className="text-body-sm text-muted-foreground">{h.hearing_time}</span>}
                    <StatusBadge status={h.status} type="custom" />
                  </div>
                  <div className="text-body-sm text-muted-foreground mt-1">
                    {h.hearing_type}{h.court_room ? ` • ${h.court_room}` : ''}
                  </div>
                  {(h.outcome || h.outcome_ar) && (
                    <p className="text-body-sm text-foreground mt-1.5">
                      {isEN ? h.outcome : (h.outcome_ar || h.outcome)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Documents */}
      <Card className="p-5">
        <h2 className="text-body-md font-semibold text-foreground mb-3">
          {isEN ? 'Shared documents' : 'المستندات المشاركة'}
        </h2>
        {(documents ?? []).length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            {isEN ? 'No documents shared.' : 'لا توجد مستندات مشاركة.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {documents!.map((d) => (
              <li key={d.id}>
                <Link to={`/portal/documents/${d.id}`} className="py-2.5 flex items-center gap-3 hover:text-accent transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium text-foreground truncate">
                    {isEN ? (d.title || d.file_name) : (d.title_ar || d.title || d.file_name)}
                  </div>
                  <div className="text-body-xs text-muted-foreground">
                    {(d.file_size_bytes / 1024).toFixed(1)} KB · {fmtDate(d.created_at)}
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
