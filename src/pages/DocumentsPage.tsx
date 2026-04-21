import { useEffect, useState, useCallback, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Search, FileText, Sparkles, Archive, Download, MoreVertical,
  Upload, Files, FileStack, Library, Scale, ArrowUpRight,
} from 'lucide-react';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';
import DocumentDetailSlideOver from '@/components/documents/DocumentDetailSlideOver';
import DocumentTemplatesView from '@/components/documents/DocumentTemplatesView';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HelpButton } from '@/components/ui/HelpButton';
import { downloadDocumentById } from '@/lib/documentAccess';

const DocumentArchivePage = lazy(() => import('@/pages/DocumentArchivePage'));

type TabKey = 'internal' | 'case' | 'templates' | 'archive';

interface BaseDocRow {
  id: string;
  file_name: string;
  title: string | null;
  document_category: string;
  file_size_bytes: number;
  file_type: string;
  created_at: string;
  is_visible_to_client: boolean;
  indexing_status: string;
}

interface CaseDocRow extends BaseDocRow {
  case_id: string | null;
  case: {
    id: string;
    case_number: string;
    title: string;
    title_ar: string | null;
  } | null;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = profile?.organization_id;
  const isAR = language === 'ar';

  const initialTab = (searchParams.get('tab') as TabKey) || 'internal';
  const [tab, setTab] = useState<TabKey>(
    ['internal', 'case', 'templates', 'archive'].includes(initialTab) ? initialTab : 'internal'
  );

  const handleTabChange = (next: string) => {
    setTab(next as TabKey);
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display text-foreground tracking-tight">
            {isAR ? 'المستندات' : 'Documents'}
          </h1>
          <p className="text-body-md text-muted-foreground mt-1.5">
            {isAR
              ? 'تنظيم واضح بين مستندات العمل الداخلية، مستندات القضايا، القوالب، وأرشيف المكتب الذكي'
              : 'Clear separation between internal working documents, case files, templates, and your firm archive'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/documents/archived')}>
            <Archive className="h-3.5 w-3.5 me-1.5" />
            {isAR ? 'المؤرشفة' : 'Archived'}
          </Button>
          <HelpButton helpKey="documents" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-card border border-border h-auto p-1 flex flex-wrap">
          <TabsTrigger value="internal" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Files className="h-3.5 w-3.5" />
            {isAR ? 'العمل الداخلي' : 'Internal'}
          </TabsTrigger>
          <TabsTrigger value="case" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Scale className="h-3.5 w-3.5" />
            {isAR ? 'مستندات القضايا' : 'Case Files'}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <FileStack className="h-3.5 w-3.5" />
            {isAR ? 'القوالب' : 'Templates'}
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Library className="h-3.5 w-3.5" />
            {isAR ? 'الأرشيف الذكي' : 'Smart Archive'}
            <Sparkles className="h-3 w-3 opacity-70" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-0">
          <InternalDocumentsTab orgId={orgId} isAR={isAR} />
        </TabsContent>

        <TabsContent value="case" className="mt-0">
          <CaseDocumentsTab orgId={orgId} isAR={isAR} />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <DocumentTemplatesView onDocumentSaved={() => { /* no-op */ }} />
        </TabsContent>

        <TabsContent value="archive" className="mt-0">
          <Suspense fallback={<div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-md" />)}</div>}>
            <DocumentArchivePage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InternalDocumentsTab({ orgId, isAR }: { orgId: string | null | undefined; isAR: boolean }) {
  const [docs, setDocs] = useState<BaseDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from('documents')
      .select('id, file_name, title, document_category, file_size_bytes, file_type, created_at, is_visible_to_client, indexing_status')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_latest_version', true)
      .eq('visibility_scope', 'internal')
      .order('created_at', { ascending: false })
      .limit(200);

    if (search.trim()) {
      const s = search.trim().replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`file_name.ilike.%${s}%,title.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setDocs((data || []) as BaseDocRow[]);
    setLoading(false);
  }, [orgId, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`docs-internal-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `organization_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, load]);

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from('documents').update({ status: 'archived' } as any).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(isAR ? 'تمت الأرشفة' : 'Archived'); load(); }
  };

  const handleDownload = async (d: BaseDocRow) => {
    await downloadDocumentById(d.id, d.file_name);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isAR ? 'ابحث في المستندات الداخلية...' : 'Search internal documents…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-10"
          />
        </div>
        <Button onClick={() => setUploadOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Upload className="h-3.5 w-3.5 me-1.5" />
          {isAR ? 'رفع مستند داخلي' : 'Upload Internal Document'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isAR ? 'لا توجد مستندات داخلية' : 'No internal documents yet'}
          titleAr={isAR ? 'لا توجد مستندات داخلية' : 'No internal documents yet'}
          subtitle={isAR ? 'هنا تظهر ملفات المكتب اليومية غير المرتبطة بقضية محددة' : 'Day-to-day firm documents not tied to a specific case appear here'}
          subtitleAr={isAR ? 'هنا تظهر ملفات المكتب اليومية غير المرتبطة بقضية محددة' : 'Day-to-day firm documents not tied to a specific case appear here'}
          actionLabel={isAR ? 'رفع مستند داخلي' : 'Upload Internal Document'}
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="border border-border rounded-md overflow-hidden bg-card">
          {docs.map((d, idx) => (
            <div key={d.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition ${idx > 0 ? 'border-t border-border' : ''}`}>
              <button onClick={() => setDetailId(d.id)} className="flex items-center gap-3 flex-1 min-w-0 text-start">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{d.title || d.file_name}</span>
                    {d.indexing_status === 'done' && (
                      <Badge variant="outline" className="text-[10px] gap-1 h-5">
                        <Sparkles className="h-2.5 w-2.5" />{isAR ? 'مفهرس' : 'Indexed'}
                      </Badge>
                    )}
                    {d.is_visible_to_client && (
                      <Badge variant="outline" className="text-[10px] h-5">{isAR ? 'مرئي للعميل' : 'Client visible'}</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(d.created_at), 'MMM dd, yyyy')} • {fmtSize(d.file_size_bytes)} • {d.file_type?.toUpperCase()}
                  </div>
                </div>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload(d)}>
                    <Download className="h-3.5 w-3.5 me-2" />{isAR ? 'تحميل' : 'Download'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(d.id)}>
                    <Archive className="h-3.5 w-3.5 me-2" />{isAR ? 'أرشفة' : 'Archive'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onComplete={load}
        visibilityScopeOverride="internal"
        titleOverride="Upload Internal Document"
        titleOverrideAr="رفع مستند داخلي"
      />

      <DocumentDetailSlideOver
        documentId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        onRefresh={load}
      />
    </div>
  );
}

function CaseDocumentsTab({ orgId, isAR }: { orgId: string | null | undefined; isAR: boolean }) {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<CaseDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, title, document_category, file_size_bytes, file_type, created_at, is_visible_to_client, indexing_status, case_id, case:cases(id, case_number, title, title_ar)')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_latest_version', true)
      .eq('visibility_scope', 'case_specific')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) toast.error(error.message);
    else setDocs((data || []) as unknown as CaseDocRow[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const caseTitle = isAR ? (d.case?.title_ar || d.case?.title || '') : (d.case?.title || '');
      const haystack = [d.file_name, d.title || '', d.case?.case_number || '', caseTitle].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [docs, search, isAR]);

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from('documents').update({ status: 'archived' } as any).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(isAR ? 'تمت الأرشفة' : 'Archived'); load(); }
  };

  const handleDownload = async (d: CaseDocRow) => {
    await downloadDocumentById(d.id, d.file_name);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isAR ? 'ابحث في مستندات القضايا أو برقم القضية...' : 'Search case documents or case number…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-10"
          />
        </div>
        <Button variant="outline" onClick={() => navigate('/cases')}>
          <ArrowUpRight className="h-3.5 w-3.5 me-1.5" />
          {isAR ? 'الذهاب إلى القضايا' : 'Open Cases'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={isAR ? 'لا توجد مستندات قضايا' : 'No case documents yet'}
          titleAr={isAR ? 'لا توجد مستندات قضايا' : 'No case documents yet'}
          subtitle={isAR ? 'تُرفع هذه المستندات من داخل كل قضية حتى تبقى مرتبطة بالقضية الصحيحة' : 'These files are uploaded from within each case so they stay linked to the correct case'}
          subtitleAr={isAR ? 'تُرفع هذه المستندات من داخل كل قضية حتى تبقى مرتبطة بالقضية الصحيحة' : 'These files are uploaded from within each case so they stay linked to the correct case'}
        />
      ) : (
        <div className="border border-border rounded-md overflow-hidden bg-card">
          {filteredDocs.map((d, idx) => {
            const caseTitle = isAR ? (d.case?.title_ar || d.case?.title) : d.case?.title;
            return (
              <div key={d.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition ${idx > 0 ? 'border-t border-border' : ''}`}>
                <button onClick={() => setDetailId(d.id)} className="flex items-center gap-3 flex-1 min-w-0 text-start">
                  <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">{d.title || d.file_name}</span>
                      {d.is_visible_to_client && (
                        <Badge variant="outline" className="text-[10px] h-5">{isAR ? 'مشترك مع العميل' : 'Shared with client'}</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                      <span>{d.case?.case_number || (isAR ? 'بدون قضية' : 'No case')}</span>
                      {caseTitle && <span>• {caseTitle}</span>}
                      <span>• {format(new Date(d.created_at), 'MMM dd, yyyy')}</span>
                      <span>• {fmtSize(d.file_size_bytes)}</span>
                    </div>
                  </div>
                </button>
                {d.case?.id && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/cases/${d.case!.id}`)}>
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(d)}>
                      <Download className="h-3.5 w-3.5 me-2" />{isAR ? 'تحميل' : 'Download'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(d.id)}>
                      <Archive className="h-3.5 w-3.5 me-2" />{isAR ? 'أرشفة' : 'Archive'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <DocumentDetailSlideOver
        documentId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        onRefresh={load}
      />
    </div>
  );
}
