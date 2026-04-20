import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Briefcase, Calendar, FileText, Gavel, Pencil, Scale, Users,
  Activity, CheckSquare, ClipboardList, Upload, Plus, Folder, UserCog, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
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
import CaseQuickTasks from '@/components/tasks/CaseQuickTasks';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';
import { toast } from 'sonner';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const lang = language as 'en' | 'ar';
  const isAR = lang === 'ar';

  const [showUpload, setShowUpload] = useState(false);

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
        .from('case_hearings').select('*').eq('case_id', id!)
        .order('hearing_date', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ['case-notes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_notes').select('*').eq('case_id', id!)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ['case-documents', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_name_ar, file_size_bytes, file_type, document_category, is_visible_to_client, created_at, uploaded_by')
        .eq('case_id', id!)
        .eq('is_latest_version', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: errands } = useQuery({
    queryKey: ['case-errands', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('errands').select('id, errand_number, title, title_ar, status, priority, due_date, completed_steps, total_steps')
        .eq('case_id', id!).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: team, refetch: refetchTeam } = useQuery({
    queryKey: ['case-team', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_team_members')
        .select('id, role, user_id, profiles:profiles!case_team_members_user_id_fkey(first_name, last_name, first_name_ar, last_name_ar, email, role)')
        .eq('case_id', id!);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ['case-activities', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_activities')
        .select('id, activity_type, title, title_ar, description, description_ar, created_at, profiles:profiles!case_activities_actor_id_fkey(first_name, last_name)')
        .eq('case_id', id!).order('created_at', { ascending: false }).limit(100);
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
          <ArrowLeft size={14} /> {isAR ? 'العودة إلى القضايا' : 'Back to cases'}
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
            <Pencil size={14} /> {isAR ? 'تعديل' : 'Edit'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><FileText size={14} className="me-1.5" /> {isAR ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="parties"><Users size={14} className="me-1.5" /> {isAR ? 'الأطراف' : 'Parties'}</TabsTrigger>
          <TabsTrigger value="hearings"><Gavel size={14} className="me-1.5" /> {isAR ? 'الجلسات' : 'Hearings'}</TabsTrigger>
          <TabsTrigger value="documents"><Folder size={14} className="me-1.5" /> {isAR ? 'المستندات' : 'Documents'} {documents && documents.length > 0 && <span className="ms-1 text-[10px] opacity-70">({documents.length})</span>}</TabsTrigger>
          <TabsTrigger value="tasks"><CheckSquare size={14} className="me-1.5" /> {isAR ? 'المهام' : 'Tasks'}</TabsTrigger>
          <TabsTrigger value="errands"><ClipboardList size={14} className="me-1.5" /> {isAR ? 'المعاملات' : 'Errands'} {errands && errands.length > 0 && <span className="ms-1 text-[10px] opacity-70">({errands.length})</span>}</TabsTrigger>
          <TabsTrigger value="team"><UserCog size={14} className="me-1.5" /> {isAR ? 'الفريق' : 'Team'}</TabsTrigger>
          <TabsTrigger value="notes"><FileText size={14} className="me-1.5" /> {isAR ? 'الملاحظات' : 'Notes'}</TabsTrigger>
          <TabsTrigger value="activity"><Activity size={14} className="me-1.5" /> {isAR ? 'النشاط' : 'Activity'}</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title={isAR ? 'المحكمة' : 'Court'} icon={Scale}>
              <Row label={isAR ? 'النوع' : 'Type'} value={caseRow.court_type} />
              <Row label={isAR ? 'الاسم' : 'Name'} value={isAR && caseRow.court_name_ar ? caseRow.court_name_ar : caseRow.court_name} />
              <Row label={isAR ? 'رقم المحكمة' : 'Court number'} value={caseRow.court_case_number} />
              <Row label={isAR ? 'القاضي' : 'Judge'} value={isAR && caseRow.judge_name_ar ? caseRow.judge_name_ar : caseRow.judge_name} />
            </InfoCard>
            <InfoCard title={isAR ? 'التواريخ والقيمة' : 'Dates & value'} icon={Calendar}>
              <Row label={isAR ? 'تاريخ الإيداع' : 'Filing date'} value={caseRow.filing_date ? format(new Date(caseRow.filing_date), 'PP') : null} />
              <Row label={isAR ? 'القيمة المقدّرة' : 'Estimated value'} value={caseRow.estimated_value?.toLocaleString() ?? null} />
              <Row label={isAR ? 'نوع الفوترة' : 'Billing type'} value={caseRow.billing_type} />
            </InfoCard>
          </div>
          {(caseRow.description || caseRow.description_ar) && (
            <InfoCard title={isAR ? 'الوصف' : 'Description'} icon={FileText}>
              <p className="text-body-md text-foreground whitespace-pre-wrap">
                {isAR && caseRow.description_ar ? caseRow.description_ar : caseRow.description}
              </p>
            </InfoCard>
          )}
        </TabsContent>

        {/* PARTIES */}
        <TabsContent value="parties" className="mt-6">
          {profile?.organization_id && <CasePartiesEditor caseId={id!} organizationId={profile.organization_id} />}
        </TabsContent>

        {/* HEARINGS */}
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

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading-sm">{isAR ? 'مستندات القضية' : 'Case documents'}</h3>
            <Button onClick={() => setShowUpload(true)}>
              <Upload size={14} /> {isAR ? 'رفع مستند' : 'Upload document'}
            </Button>
          </div>
          {(documents?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState
                icon={Folder}
                title="No documents yet"
                titleAr="لا توجد مستندات بعد"
                subtitle="Upload contracts, court filings, evidence, and more."
                subtitleAr="ارفع العقود واللوائح القضائية والأدلة وغير ذلك."
                actionLabel="Upload document"
                actionLabelAr="رفع مستند"
                onAction={() => setShowUpload(true)}
                size="sm"
              />
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card divide-y divide-border">
              {documents!.map((d: any) => (
                <div key={d.id} className="p-4 flex items-center gap-3">
                  <FileText size={18} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium truncate">{isAR && d.file_name_ar ? d.file_name_ar : d.file_name}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {(d.file_size_bytes / 1024).toFixed(0)} KB · {format(new Date(d.created_at), 'PP')}
                      {d.is_visible_to_client && <span className="ms-2 text-accent">{isAR ? '· مرئي للعميل' : '· client visible'}</span>}
                    </p>
                  </div>
                  <span className="text-[11px] rounded-badge bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                    {d.document_category?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="mt-6">
          <CaseQuickTasks caseId={id!} />
        </TabsContent>

        {/* ERRANDS */}
        <TabsContent value="errands" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading-sm">{isAR ? 'المعاملات المرتبطة' : 'Linked errands'}</h3>
            <Button onClick={() => navigate(`/errands/new?case_id=${id}`)}>
              <Plus size={14} /> {isAR ? 'معاملة جديدة' : 'New errand'}
            </Button>
          </div>
          {(errands?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState icon={ClipboardList} title="No errands linked" titleAr="لا توجد معاملات مرتبطة" size="sm" />
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card divide-y divide-border">
              {errands!.map((e: any) => (
                <Link key={e.id} to={`/errands/${e.id}`} className="p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">{e.errand_number}</span>
                      <StatusBadge status={e.status} type="custom" customColor="#64748B" size="sm" />
                    </div>
                    <p className="text-body-md font-medium truncate mt-1">{isAR && e.title_ar ? e.title_ar : e.title}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {e.completed_steps}/{e.total_steps} {isAR ? 'خطوات' : 'steps'}
                      {e.due_date && ` · ${format(new Date(e.due_date), 'PP')}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="mt-6">
          <CaseTeamSection caseId={id!} organizationId={profile?.organization_id || ''} team={team || []} onChange={() => refetchTeam()} />
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes" className="mt-6">
          {(notes?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState icon={FileText} title="No notes yet" titleAr="لا توجد ملاحظات" size="sm" />
            </div>
          ) : (
            <div className="space-y-3">
              {notes!.map((n) => (
                <div key={n.id} className="rounded-card border border-border bg-card p-4">
                  <p className="text-body-md text-foreground whitespace-pre-wrap">{isAR && n.content_ar ? n.content_ar : n.content}</p>
                  <p className="text-body-sm text-muted-foreground mt-2">{format(new Date(n.created_at), 'PPp')}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-6">
          {(activities?.length ?? 0) === 0 ? (
            <div className="rounded-card border border-border bg-card">
              <EmptyState icon={Activity} title="No activity yet" titleAr="لا يوجد نشاط بعد" size="sm" />
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card divide-y divide-border">
              {activities!.map((a: any) => (
                <div key={a.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <p className="text-body-md font-medium">{isAR && a.title_ar ? a.title_ar : a.title}</p>
                  </div>
                  {(a.description || a.description_ar) && (
                    <p className="text-body-sm text-muted-foreground mt-1 ms-6">{isAR && a.description_ar ? a.description_ar : a.description}</p>
                  )}
                  <p className="text-body-sm text-muted-foreground mt-1 ms-6">
                    {a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : ''} · {format(new Date(a.created_at), 'PPp')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload modal pre-linked to this case */}
      <DocumentUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={() => { setShowUpload(false); refetchDocs(); }}
        caseId={id!}
      />
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

/* ---------------- Team section ---------------- */

function CaseTeamSection({
  caseId, organizationId, team, onChange,
}: { caseId: string; organizationId: string; team: any[]; onChange: () => void }) {
  const { language } = useLanguage();
  const isAR = language === 'ar';
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState('member');

  const { data: orgUsers } = useQuery({
    queryKey: ['org-staff', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, email, role')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .neq('role', 'client');
      if (error) throw error;
      return data || [];
    },
  });

  const handleAdd = async () => {
    if (!newUserId) return;
    setAdding(true);
    const { error } = await supabase.from('case_team_members').insert({
      case_id: caseId, organization_id: organizationId, user_id: newUserId, role: newRole,
    });
    setAdding(false);
    if (error) toast.error(error.message);
    else { toast.success(isAR ? 'تمت الإضافة' : 'Added'); setNewUserId(''); setNewRole('member'); onChange(); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(isAR ? 'إزالة هذا العضو؟' : 'Remove this member?')) return;
    const { error } = await supabase.from('case_team_members').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success(isAR ? 'تمت الإزالة' : 'Removed'); onChange(); }
  };

  const ROLES = [
    { value: 'lead_attorney', label: isAR ? 'محامي رئيسي' : 'Lead attorney' },
    { value: 'member', label: isAR ? 'عضو' : 'Member' },
    { value: 'reviewer', label: isAR ? 'مراجع' : 'Reviewer' },
    { value: 'observer', label: isAR ? 'مراقب' : 'Observer' },
  ];

  const availableUsers = (orgUsers || []).filter((u) => !team.some((t) => t.user_id === u.id));

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-card divide-y divide-border">
        {team.length === 0 ? (
          <div className="p-6 text-center text-body-sm text-muted-foreground">
            {isAR ? 'لا يوجد أعضاء بعد' : 'No team members yet'}
          </div>
        ) : team.map((t) => (
          <div key={t.id} className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-body-sm font-semibold">
              {(t.profiles?.first_name?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-medium truncate">
                {isAR && t.profiles?.first_name_ar ? `${t.profiles.first_name_ar} ${t.profiles.last_name_ar || ''}` : `${t.profiles?.first_name || ''} ${t.profiles?.last_name || ''}`}
              </p>
              <p className="text-body-sm text-muted-foreground truncate">{t.profiles?.email}</p>
            </div>
            <span className="text-[11px] rounded-badge bg-muted px-2 py-0.5 text-muted-foreground capitalize">
              {ROLES.find(r => r.value === t.role)?.label || t.role.replace(/_/g, ' ')}
            </span>
            <button onClick={() => handleRemove(t.id)} className="text-body-sm text-muted-foreground hover:text-destructive">
              {isAR ? 'إزالة' : 'Remove'}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border p-3 bg-muted/20 space-y-3">
        <p className="text-label text-muted-foreground">{isAR ? 'إضافة عضو فريق' : 'Add team member'}</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
          <select
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            className="h-10 rounded-input border border-border bg-card px-3 text-body-md"
          >
            <option value="">{isAR ? 'اختر عضواً…' : 'Select user…'}</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.email})
              </option>
            ))}
          </select>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="h-10 rounded-input border border-border bg-card px-3 text-body-md"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Button onClick={handleAdd} disabled={!newUserId || adding}>
            <Plus size={14} /> {isAR ? 'إضافة' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}
