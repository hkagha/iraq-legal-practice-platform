import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Upload, Files, FileStack, Library,
} from 'lucide-react';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';
import DocumentDetailSlideOver from '@/components/documents/DocumentDetailSlideOver';
import DocumentTemplatesView from '@/components/documents/DocumentTemplatesView';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HelpButton } from '@/components/ui/HelpButton';

const DocumentArchivePage = lazy(() => import('@/pages/DocumentArchivePage'));
const DocumentsArchivedPage = lazy(() => import('@/pages/DocumentsArchivedPage'));

interface DocRow {
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

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

type TabKey = 'working' | 'templates' | 'archive' | 'archived';

export default function DocumentsPage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = profile?.organization_id;
  const isAR = language === 'ar';

  const initialTab = (searchParams.get('tab') as TabKey) || 'working';
  const [tab, setTab] = useState<TabKey>(
    ['working', 'templates', 'archive', 'archived'].includes(initialTab) ? initialTab : 'working'
  );

  const handleTabChange = (next: string) => {
    setTab(next as TabKey);
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Page-level title (compact, since each tab has its own header/toolbar) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md font-display text-foreground tracking-tight">
            {isAR ? 'المستندات' : 'Documents'}
          </h1>
          <p className="text-body-md text-muted-foreground mt-1.5">
            {isAR
              ? 'مساحة موحّدة لمستندات المكتب: العمل اليومي، القوالب، والأرشيف الذكي'
              : 'One unified workspace for day-to-day documents, templates, and your AI-indexed firm archive'}
          </p>
        </div>
        <HelpButton helpKey="documents" />
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-card border border-border h-auto p-1">
          <TabsTrigger value="working" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Files className="h-3.5 w-3.5" />
            {isAR ? 'العمل اليومي' : 'Working'}
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
          <TabsTrigger value="archived" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Archive className="h-3.5 w-3.5" />
            {isAR ? 'المؤرشفة' : 'Archived'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="working" className="mt-0">
          <WorkingDocumentsTab orgId={orgId} isAR={isAR} />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <DocumentTemplatesView onDocumentSaved={() => { /* no-op; templates view manages its own state */ }} />
        </TabsContent>

        <TabsContent value="archive" className="mt-0">
          <Suspense fallback={<div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-md" />)}</div>}>
            <DocumentArchivePage />
          </Suspense>
        </TabsContent>

        <TabsContent value="archived" className="mt-0">
          <Suspense fallback={<div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-md" />)}</div>}>
            <DocumentsArchivedPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
 * Working Documents tab — internal day-to-day documents.
 * Excludes archive imports (visibility_scope='shared_library').
 * ============================================================ */
function WorkingDocumentsTab({ orgId, isAR }: { orgId: string | null | undefined; isAR: boolean }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from('documents')
      .select('id, file_name, title, document_category, file_size_bytes, file_type, created_at, is_visible_to_client, indexing_status, visibility_scope')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_latest_version', true)
      .neq('visibility_scope', 'shared_library')
      .order('created_at', { ascending: false })
      .limit(200);
    if (search.trim()) {
      const s = search.trim().replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`file_name.ilike.%${s}%,title.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setDocs((data || []) as DocRow[]);
    setLoading(false);
  }, [orgId, search]);

  useEffect(() => { load(); }, [load]);

  // Realtime refresh on indexing/status changes
  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`docs-working-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `organization_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, load]);

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from('documents').update({ status: 'archived' } as any).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(isAR ? 'تمت الأرشفة' : 'Archived'); load(); }
  };

  const handleDownload = async (d: DocRow) => {
    const { data: row } = await supabase.from('documents').select('file_path').eq('id', d.id).single();
    if (!row?.file_path) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(row.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl; a.download = d.file_name; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isAR ? 'ابحث في المستندات...' : 'Search working documents…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-10"
          />
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Upload className="h-3.5 w-3.5 me-1.5" />
          {isAR ? 'رفع مستند' : 'Upload Document'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isAR ? 'لا توجد مستندات' : 'No working documents yet'}
          titleAr={isAR ? 'لا توجد مستندات' : 'No working documents yet'}
          subtitle={isAR ? 'مستنداتك الداخلية وملفات القضايا والمعاملات تظهر هنا' : 'Your internal, case, and errand documents appear here'}
          subtitleAr={isAR ? 'مستنداتك الداخلية وملفات القضايا والمعاملات تظهر هنا' : 'Your internal, case, and errand documents appear here'}
          actionLabel={isAR ? 'رفع مستند' : 'Upload Document'}
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="border border-border rounded-md overflow-hidden bg-card">
          {docs.map((d, idx) => (
            <div
              key={d.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition ${idx > 0 ? 'border-t border-border' : ''}`}
            >
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
                    {d.indexing_status === 'processing' && (
                      <Badge variant="outline" className="text-[10px] h-5">{isAR ? 'قيد التحليل' : 'Analyzing'}</Badge>
                    )}
                    {d.indexing_status === 'failed' && (
                      <Badge variant="outline" className="text-[10px] h-5 text-destructive">{isAR ? 'فشل' : 'Failed'}</Badge>
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
