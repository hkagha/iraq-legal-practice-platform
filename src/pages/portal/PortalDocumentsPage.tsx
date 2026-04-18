import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Download, Search, Upload, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PortalDocumentDetailSlideOver from '@/components/portal/PortalDocumentDetailSlideOver';

interface DocItem {
  id: string;
  organization_id: string;
  file_name: string;
  file_name_ar: string | null;
  title: string | null;
  title_ar: string | null;
  document_category: string;
  file_type: string;
  file_path: string;
  file_size_bytes: number;
  created_at: string;
  case_id: string | null;
  errand_id: string | null;
  cases?: { case_number: string | null } | null;
  errands?: { errand_number: string | null } | null;
}

export default function PortalDocumentsPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { activeClientId } = usePortalOrg();

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [linkedTo, setLinkedTo] = useState<'all' | 'cases' | 'errands' | 'general'>('all');
  const [detailDocId, setDetailDocId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCases, setUploadCases] = useState<any[]>([]);
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!activeClientId) return;
    loadDocuments();
    loadUploadCases();
  }, [activeClientId]);

  const loadUploadCases = async () => {
    const { data } = await supabase
      .from('cases')
      .select('id, case_number, title, title_ar')
      .eq('client_id', activeClientId!)
      .eq('is_visible_to_client', true)
      .order('created_at', { ascending: false });
    setUploadCases(data || []);
  };

  const handleUploadNew = async () => {
    if (!uploadFile || !uploadCaseId || !profile?.id || !activeClientId) return;
    if (uploadFile.size > 10 * 1024 * 1024) { toast({ title: 'Error', description: language === 'ar' ? 'الملف كبير جداً (الحد ١٠MB)' : 'File too large (10MB max)', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const caseObj = uploadCases.find(c => c.id === uploadCaseId);
      if (!caseObj) throw new Error('Case not found');
      const { data: orgData } = await supabase.from('cases').select('organization_id').eq('id', uploadCaseId).maybeSingle();
      const orgId = orgData?.organization_id;
      if (!orgId) throw new Error('Organization not found');

      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${orgId}/clients/${activeClientId}/case-${uploadCaseId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, uploadFile, { contentType: uploadFile.type });
      if (upErr) throw new Error(`Storage: ${upErr.message}`);

      const ext = uploadFile.name.split('.').pop()?.toLowerCase() || '';
      const { error: insErr } = await supabase.from('documents').insert({
        organization_id: orgId,
        file_name: uploadFile.name,
        file_path: path,
        file_size_bytes: uploadFile.size,
        file_type: ext,
        mime_type: uploadFile.type,
        document_category: 'client_upload',
        case_id: uploadCaseId,
        client_id: activeClientId,
        is_visible_to_client: true,
        visibility_scope: 'case_specific',
        version: 1,
        is_latest_version: true,
        uploaded_by: profile.id,
      } as any);
      if (insErr) throw new Error(`Database: ${insErr.message}`);

      toast({ title: language === 'ar' ? 'تم رفع المستند' : 'Document uploaded' });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadCaseId('');
      await loadDocuments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const [casesRes, errandsRes] = await Promise.all([
        supabase.from('cases').select('id').eq('client_id', activeClientId!).eq('is_visible_to_client', true),
        supabase.from('errands').select('id').eq('client_id', activeClientId!).eq('is_visible_to_client', true),
      ]);

      const caseIds = (casesRes.data || []).map((c: any) => c.id);
      const errandIds = (errandsRes.data || []).map((e: any) => e.id);

      const orParts = [`client_id.eq.${activeClientId}`];
      if (caseIds.length) orParts.push(`case_id.in.(${caseIds.join(',')})`);
      if (errandIds.length) orParts.push(`errand_id.in.(${errandIds.join(',')})`);

      const { data, error } = await supabase
        .from('documents')
        .select('id, organization_id, file_name, file_name_ar, title, title_ar, document_category, file_type, file_path, file_size_bytes, created_at, case_id, errand_id, cases(case_number), errands(errand_number)')
        .eq('is_visible_to_client', true)
        .eq('status', 'active')
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setDocuments((data || []) as unknown as DocItem[]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: DocItem) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
      if (error || !data?.signedUrl) throw error || new Error('Failed to generate download link');

      await supabase.from('document_activities').insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        actor_id: profile?.id,
        activity_type: 'downloaded',
        title: 'Document downloaded by client',
        title_ar: 'تم تحميل مستند من العميل',
        metadata: { source: 'client_portal' },
      } as any);

      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Download failed', variant: 'destructive' });
    }
  };

  const formatDate = (d: string) => {
    try {
      return language === 'ar'
        ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale })
        : format(new Date(d), 'MMM dd, yyyy');
    } catch {
      return d;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(documents.map(d => d.document_category))).sort()],
    [documents]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return documents.filter(d => {
      const name = (d.title || d.file_name || '').toLowerCase();
      if (s && !name.includes(s)) return false;
      if (categoryFilter !== 'all' && d.document_category !== categoryFilter) return false;
      if (linkedTo === 'cases' && !d.case_id) return false;
      if (linkedTo === 'errands' && !d.errand_id) return false;
      if (linkedTo === 'general' && (d.case_id || d.errand_id)) return false;
      return true;
    });
  }, [documents, search, categoryFilter, linkedTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-display-lg font-bold text-foreground">{t('portal.documents.title')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{t('portal.documents.subtitle')}</p>
        </div>
        {uploadCases.length > 0 && (
          <Button onClick={() => setUploadOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Upload className="h-4 w-4 me-2" />
            {language === 'ar' ? 'رفع مستند' : 'Upload document'}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-body-sm">
          {categories.map(c => (
            <option key={c} value={c}>{c === 'all' ? t('common.all') : c}</option>
          ))}
        </select>
        <select value={linkedTo} onChange={e => setLinkedTo(e.target.value as any)} className="h-10 rounded-md border border-input bg-background px-3 text-body-sm">
          <option value="all">{t('common.all')}</option>
          <option value="cases">{language === 'en' ? 'Cases' : 'قضايا'}</option>
          <option value="errands">{language === 'en' ? 'Errands' : 'معاملات'}</option>
          <option value="general">{language === 'en' ? 'General' : 'عام'}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title={t('portal.documents.noDocuments')} titleAr={t('portal.documents.noDocuments')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const name = language === 'ar' && doc.title_ar ? doc.title_ar : doc.title || doc.file_name;
            const linkedLabel = doc.case_id
              ? `${language === 'en' ? 'Case' : 'قضية'}: ${doc.cases?.case_number || '—'}`
              : doc.errand_id
              ? `${language === 'en' ? 'Errand' : 'معاملة'}: ${doc.errands?.errand_number || '—'}`
              : null;

            return (
              <div key={doc.id} onClick={() => setDetailDocId(doc.id)} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-md font-medium text-foreground truncate" title={name}>{name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{doc.document_category}</span>
                      <span className="text-body-sm text-muted-foreground">{formatSize(doc.file_size_bytes)}</span>
                    </div>
                    {linkedLabel && <p className="text-body-sm text-muted-foreground mt-1">{linkedLabel}</p>}
                    <p className="text-body-sm text-muted-foreground mt-1">{t('portal.documents.sharedOn')} {formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-accent text-accent text-body-sm font-medium hover:bg-accent/10 transition-colors"
                >
                  <Download className="h-4 w-4" /> {t('portal.documents.download')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <PortalDocumentDetailSlideOver
        documentId={detailDocId}
        isOpen={!!detailDocId}
        onClose={() => setDetailDocId(null)}
        onRefresh={loadDocuments}
      />

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'رفع مستند جديد' : 'Upload new document'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-body-sm font-medium text-foreground mb-1 block">
                {language === 'ar' ? 'اختر القضية' : 'Select case'}
              </label>
              <select value={uploadCaseId} onChange={e => setUploadCaseId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-body-sm">
                <option value="">{language === 'ar' ? '— اختر —' : '— Select —'}</option>
                {uploadCases.map(c => (
                  <option key={c.id} value={c.id}>{c.case_number} — {language === 'ar' && c.title_ar ? c.title_ar : c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-body-sm font-medium text-foreground mb-1 block">
                {language === 'ar' ? 'الملف' : 'File'}
              </label>
              <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="block w-full text-body-sm" />
              {uploadFile && (
                <p className="text-body-sm text-muted-foreground mt-1 inline-flex items-center gap-2">
                  {uploadFile.name}
                  <button onClick={() => setUploadFile(null)}><X className="h-3 w-3" /></button>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleUploadNew} disabled={!uploadFile || !uploadCaseId || uploading} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {uploading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
              {language === 'ar' ? 'رفع' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
