import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Download, Search, File, Image, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';

interface DocItem {
  id: string;
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
}

export default function PortalDocumentsPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (!profile?.id) return;
    loadDocuments();
  }, [profile?.id]);

  const loadDocuments = async () => {
    setLoading(true);
    const { data: link } = await supabase.from('client_user_links').select('client_id').eq('user_id', profile!.id).maybeSingle();
    if (!link) { setLoading(false); return; }

    const { data } = await supabase
      .from('documents')
      .select('id, file_name, file_name_ar, title, title_ar, document_category, file_type, file_path, file_size_bytes, created_at, case_id, errand_id')
      .eq('client_id', link.client_id)
      .eq('is_visible_to_client', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setDocuments((data || []) as DocItem[]);
    setLoading(false);
  };

  const handleDownload = async (doc: DocItem) => {
    const bucket = doc.file_path.startsWith('errand') ? 'errand-documents' : 'documents';
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Error', description: error?.message || 'Failed to generate download link', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const formatDate = (d: string) => {
    try { return language === 'ar' ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale }) : format(new Date(d), 'MMM dd, yyyy'); }
    catch { return d; }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return Image;
    if (['xlsx', 'xls', 'csv'].includes(type)) return FileSpreadsheet;
    return File;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filtered = documents.filter(d => {
    const s = search.toLowerCase();
    const name = (d.title || d.file_name || '').toLowerCase();
    if (s && !name.includes(s)) return false;
    if (categoryFilter !== 'all' && d.document_category !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(documents.map(d => d.document_category))];

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-32 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg font-bold text-foreground">{t('portal.documents.title')}</h1>
        <p className="text-body-md text-muted-foreground mt-1">{t('portal.documents.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-body-sm">
          <option value="all">{t('common.all')}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title={t('portal.documents.noDocuments')} titleAr={t('portal.documents.noDocuments')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const Icon = getFileIcon(doc.file_type);
            const name = language === 'ar' && doc.title_ar ? doc.title_ar : doc.title || doc.file_name;
            return (
              <div key={doc.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium text-foreground truncate" title={name}>{name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{doc.document_category}</span>
                      <span className="text-body-sm text-muted-foreground">{formatSize(doc.file_size_bytes)}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground mt-1">{t('portal.documents.sharedOn')} {formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-accent text-accent text-body-sm font-medium hover:bg-accent/10 transition-colors"
                >
                  <Download className="h-4 w-4" /> {t('portal.documents.download')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
