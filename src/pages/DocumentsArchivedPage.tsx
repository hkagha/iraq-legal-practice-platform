import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, Archive, RotateCcw, Trash2, Download, FileText, MoreVertical } from 'lucide-react';
import DocumentDetailSlideOver from '@/components/documents/DocumentDetailSlideOver';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface DocRow {
  id: string;
  file_name: string;
  title: string | null;
  file_path: string;
  document_category: string;
  file_size_bytes: number;
  file_type: string;
  created_at: string;
  updated_at: string;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function DocumentsArchivedPage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const isAR = language === 'ar';

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocRow | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from('documents')
      .select('id, file_name, title, file_path, document_category, file_size_bytes, file_type, created_at, updated_at')
      .eq('organization_id', orgId)
      .eq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`file_name.ilike.%${s}%,title.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setDocs((data || []) as DocRow[]);
    setLoading(false);
  }, [orgId, search]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from('documents').update({ status: 'active' } as any).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(isAR ? 'تمت الاستعادة' : 'Restored'); load(); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    // Soft delete + remove storage object
    const { error } = await supabase.from('documents').update({ status: 'deleted' } as any).eq('id', confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    await supabase.storage.from('documents').remove([confirmDelete.file_path]).catch(() => null);
    toast.success(isAR ? 'تم الحذف نهائياً' : 'Permanently deleted');
    setConfirmDelete(null);
    load();
  };

  const handleDownload = async (d: DocRow) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl; a.download = d.file_name; a.target = '_blank';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archived Documents"
        titleAr="المستندات المؤرشفة"
        subtitle="Documents you've archived. Restore or delete permanently."
        subtitleAr="المستندات التي قمت بأرشفتها. استعدها أو احذفها نهائياً."
        helpKey="documents"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Documents', labelAr: 'المستندات', href: '/documents' },
          { label: 'Archived', labelAr: 'المؤرشفة' },
        ]}
      />

      <div className="relative max-w-lg">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isAR ? 'ابحث في المؤرشفة...' : 'Search archived…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9 h-10"
        />
      </div>

      <Badge variant="outline" className="gap-1.5">
        <Archive className="h-3 w-3" />
        {docs.length} {isAR ? 'مستند مؤرشف' : `archived document${docs.length === 1 ? '' : 's'}`}
      </Badge>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={isAR ? 'لا توجد مستندات مؤرشفة' : 'No archived documents'}
          titleAr={isAR ? 'لا توجد مستندات مؤرشفة' : 'No archived documents'}
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
                  <div className="font-medium text-foreground truncate">{d.title || d.file_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {isAR ? 'أُرشف' : 'Archived'} {format(new Date(d.updated_at), 'MMM dd, yyyy')} • {fmtSize(d.file_size_bytes)}
                  </div>
                </div>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRestore(d.id)}>
                    <RotateCcw className="h-3.5 w-3.5 me-2" />{isAR ? 'استعادة' : 'Restore'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(d)}>
                    <Download className="h-3.5 w-3.5 me-2" />{isAR ? 'تحميل' : 'Download'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(d)}>
                    <Trash2 className="h-3.5 w-3.5 me-2" />{isAR ? 'حذف نهائي' : 'Delete permanently'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <DocumentDetailSlideOver
        documentId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        onRefresh={load}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}
        title={isAR ? 'حذف نهائي؟' : 'Delete permanently?'}
        description={isAR
          ? 'سيتم حذف هذا المستند والملف من التخزين بشكل دائم. لا يمكن التراجع.'
          : 'This document and its stored file will be permanently removed. This cannot be undone.'}
        confirmLabel={isAR ? 'حذف نهائي' : 'Delete permanently'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
