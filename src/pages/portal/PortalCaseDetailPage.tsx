import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Download, Users } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import ClientMessagesTab from '@/components/clients/ClientMessagesTab';

export default function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();
  const { activeClientId } = usePortalOrg();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<any>(null);
  const [hearings, setHearings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id || !profile?.id) return;
    loadCase();
  }, [id, profile?.id]);

  const loadCase = async () => {
    setLoading(true);
    const query = supabase
      .from('cases')
      .select('*')
      .eq('id', id!)
      .eq('is_visible_to_client', true);
    if (activeClientId) query.eq('client_id', activeClientId);
    const { data: c } = await query.maybeSingle();

    if (!c) { setLoading(false); navigate('/portal/cases'); return; }
    setCaseData(c);

    // Parallel loads
    const [hearingsRes, docsRes, teamRes, notesRes] = await Promise.all([
      supabase.from('case_hearings').select('*')
        .eq('case_id', id!).eq('is_visible_to_client', true)
        .order('hearing_date', { ascending: false }),
      supabase.from('documents').select('id, file_name, file_name_ar, document_category, created_at, file_size_bytes, file_path, file_type')
        .eq('case_id', id!).eq('is_visible_to_client', true)
        .order('created_at', { ascending: false }),
      supabase.from('case_team_members').select('user_id, role').eq('case_id', id!),
      supabase.from('case_notes').select('id, content, content_ar, is_pinned, created_at, author_id')
        .eq('case_id', id!).eq('is_visible_to_client', true)
        .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
    ]);

    setHearings(hearingsRes.data || []);
    setDocuments(docsRes.data || []);
    setNotes(notesRes.data || []);

    if (teamRes.data && teamRes.data.length > 0) {
      const uids = [...new Set(teamRes.data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role')
        .in('id', uids);
      setTeam(profiles || []);
    }

    setLoading(false);
  };

  const formatDate = (d: string) => {
    try {
      return language === 'ar' ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale }) : format(new Date(d), 'MMM dd, yyyy');
    } catch { return d; }
  };

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  if (!caseData) return null;

  const nextHearing = hearings.find(h => new Date(h.hearing_date) >= new Date());
  const daysUntil = nextHearing ? differenceInDays(new Date(nextHearing.hearing_date), new Date()) : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/portal/cases" className="inline-flex items-center gap-1 text-body-sm text-accent hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t('portal.myCases')}
      </Link>

      {/* Header */}
      <div>
        <p className="text-body-sm text-muted-foreground font-mono">{caseData.case_number}</p>
        <h1 className="text-display-lg font-bold text-foreground mt-1">
          {language === 'ar' && caseData.title_ar ? caseData.title_ar : caseData.title}
        </h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <StatusBadge status={caseData.status} type="case" />
          <span className="text-body-sm bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
            {t(`cases.types.${caseData.case_type}`)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0">
          {['overview', 'hearings', 'documents', 'notes', 'messages'].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn(
                'rounded-none border-b-2 border-transparent px-5 py-3 text-body-md font-medium text-muted-foreground',
                'data-[state=active]:border-accent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent',
              )}
            >
              {tab === 'overview' ? (language === 'en' ? 'Overview' : 'نظرة عامة') :
               tab === 'hearings' ? t('portal.cases.hearings') :
               tab === 'documents' ? t('portal.myDocuments') :
               tab === 'notes' ? (language === 'en' ? 'Notes' : 'ملاحظات') :
               (language === 'en' ? 'Messages' : 'الرسائل')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {caseData.description && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="text-lg font-semibold mb-2">{language === 'en' ? 'Case Summary' : 'ملخص القضية'}</h3>
                  <p className="text-body-md text-muted-foreground whitespace-pre-wrap">
                    {language === 'ar' && caseData.description_ar ? caseData.description_ar : caseData.description}
                  </p>
                </div>
              )}
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-lg font-semibold mb-3">{language === 'en' ? 'Key Details' : 'التفاصيل الرئيسية'}</h3>
                <div className="space-y-2">
                  {[
                    [t('portal.cases.type'), t(`cases.types.${caseData.case_type}`)],
                    [t('portal.cases.court'), language === 'ar' && caseData.court_name_ar ? caseData.court_name_ar : caseData.court_name],
                    [language === 'en' ? 'Filing Date' : 'تاريخ التقديم', caseData.filing_date ? formatDate(caseData.filing_date) : null],
                    [t('portal.cases.status'), t(`statuses.case.${caseData.status}`)],
                  ].map(([label, value]) => value && (
                    <div key={String(label)} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-body-sm text-muted-foreground">{label}</span>
                      <span className="text-body-md text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              {/* Team */}
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-lg font-semibold mb-3">{t('portal.cases.caseTeam')}</h3>
                {team.length === 0 ? (
                  <p className="text-body-md text-muted-foreground">{language === 'en' ? 'No team assigned' : 'لم يتم تعيين فريق'}</p>
                ) : (
                  <div className="space-y-3">
                    {team.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-body-sm font-semibold">
                          {(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}
                        </div>
                        <div>
                          <p className="text-body-md font-medium">
                            {language === 'ar' && m.first_name_ar ? `${m.first_name_ar} ${m.last_name_ar || ''}` : `${m.first_name} ${m.last_name}`}
                          </p>
                          {m.phone && <a href={`tel:${m.phone}`} className="text-body-sm text-accent hover:underline">{m.phone}</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Next hearing */}
              {nextHearing && (
                <div className="bg-accent/5 rounded-xl border border-accent/20 p-5">
                  <h3 className="text-lg font-semibold mb-2">{t('portal.cases.nextHearing')}</h3>
                  <p className="text-display-sm font-bold text-accent">{formatDate(nextHearing.hearing_date)}</p>
                  {nextHearing.hearing_time && <p className="text-body-md text-muted-foreground">{nextHearing.hearing_time}</p>}
                  {nextHearing.court_room && <p className="text-body-sm text-muted-foreground mt-1">{nextHearing.court_room}</p>}
                  {daysUntil !== null && (
                    <p className="text-body-sm text-accent mt-2">
                      {language === 'en' ? `In ${daysUntil} days` : `خلال ${daysUntil} أيام`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hearings" className="mt-6">
          {hearings.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-8 text-center">{t('portal.cases.noHearings')}</p>
          ) : (
            <div className="space-y-3">
              {hearings.map(h => (
                <div key={h.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-md font-medium">{formatDate(h.hearing_date)}</span>
                      {h.hearing_time && <span className="text-body-sm text-muted-foreground">{h.hearing_time}</span>}
                      <StatusBadge status={h.status} type="errand" />
                    </div>
                    <p className="text-body-sm text-muted-foreground">{h.hearing_type}{h.court_room ? ` • ${h.court_room}` : ''}</p>
                    {h.outcome && <p className="text-body-sm text-foreground mt-1">{language === 'ar' && h.outcome_ar ? h.outcome_ar : h.outcome}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {documents.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-8 text-center">{t('portal.documents.noDocuments')}</p>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium text-foreground truncate">
                      {language === 'ar' && doc.file_name_ar ? doc.file_name_ar : doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                      <span>{doc.document_category}</span>
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4 me-1" /> {t('portal.documents.download')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          {notes.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-8 text-center">
              {language === 'en' ? 'No notes shared with you yet.' : 'لا توجد ملاحظات مشاركة معك بعد.'}
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map(n => (
                <div key={n.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {n.is_pinned && <span className="text-[10px] bg-accent/10 text-accent rounded px-1.5 py-0.5">{language === 'en' ? 'Pinned' : 'مثبتة'}</span>}
                    <span className="text-body-sm text-muted-foreground">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-body-md text-foreground whitespace-pre-wrap">
                    {language === 'ar' && n.content_ar ? n.content_ar : n.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          {activeClientId && (
            <ClientMessagesTab
              clientId={activeClientId}
              defaultThread={`case-${caseData.id}`}
              lockedThread
              caseLabel={`${caseData.case_number} — ${language === 'ar' && caseData.title_ar ? caseData.title_ar : caseData.title}`}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
