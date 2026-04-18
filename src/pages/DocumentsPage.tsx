import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  FileText, Upload, HardDrive, LayoutGrid, List,
  FileType, File, Image, Sheet, MoreVertical, Download,
  Eye, EyeOff, Archive, Trash2, Scale, FileCheck, User,
  X, Tag, Sparkles, Pencil, FolderOpen,
} from 'lucide-react';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';
import DocumentDetailSlideOver from '@/components/documents/DocumentDetailSlideOver';
import DocumentTemplatesView from '@/components/documents/DocumentTemplatesView';
import DocumentFolderSidebar, { FolderFilter } from '@/components/documents/DocumentFolderSidebar';

const FILE_TYPE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileType, color: '#EF4444' },
  doc: { icon: File, color: '#3B82F6' }, docx: { icon: File, color: '#3B82F6' },
  xls: { icon: Sheet, color: '#22C55E' }, xlsx: { icon: Sheet, color: '#22C55E' },
  jpg: { icon: Image, color: '#8B5CF6' }, jpeg: { icon: Image, color: '#8B5CF6' },
  png: { icon: Image, color: '#8B5CF6' }, gif: { icon: Image, color: '#8B5CF6' },
  webp: { icon: Image, color: '#8B5CF6' },
};

function getFileIcon(fileType: string) {
  const ext = fileType?.toLowerCase().replace('.', '') || '';
  return FILE_TYPE_ICONS[ext] || { icon: FileText, color: '#64748B' };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const CATEGORY_OPTIONS = [
  'contract', 'pleading', 'motion', 'brief', 'memorandum',
  'court_order', 'court_judgment', 'evidence', 'exhibit',
  'correspondence', 'letter', 'notice',
  'power_of_attorney', 'affidavit', 'declaration',
  'corporate_document', 'registration_certificate', 'license',
  'financial_document', 'invoice_document', 'receipt',
  'identity_document', 'passport', 'national_id_copy',
  'property_document', 'deed', 'title',
  'template', 'draft', 'final',
  'internal_memo', 'meeting_notes', 'research',
  'government_form', 'government_response', 'government_receipt',
  'photo', 'scan', 'other', 'general',
];

export default function DocumentsPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [maxStorageMb, setMaxStorageMb] = useState(5120);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<string>('table');
  const [activeTab, setActiveTab] = useState('documents');
  const [activeFolder, setActiveFolder] = useState<FolderFilter>({ type: 'all' });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' as 'asc' | 'desc' });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState(false);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailDocId, setDetailDocId] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  // Fetch org max storage
  useEffect(() => {
    if (!orgId) return;
    supabase.from('organizations').select('max_storage_mb').eq('id', orgId).single()
      .then(({ data }) => { if (data) setMaxStorageMb(data.max_storage_mb); });
  }, [orgId]);

  const fetchStats = useCallback(async () => {
    if (!orgId) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [totalRes, recentRes, sizeRes] = await Promise.all([
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('documents').select('file_size_bytes').eq('organization_id', orgId).eq('status', 'active'),
    ]);
    setTotalCount(totalRes.count || 0);
    setRecentCount(recentRes.count || 0);
    setTotalSize(sizeRes.data?.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0) || 0);
  }, [orgId]);

  const fetchDocuments = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    let query = supabase
      .from('documents')
      .select(`*, uploader:profiles!documents_uploaded_by_fkey(id,first_name,last_name,first_name_ar,last_name_ar,avatar_url), client:clients(id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type), case:cases(id,case_number,title,title_ar), errand:errands(id,errand_number,title,title_ar)`, { count: 'exact' })
      .eq('organization_id', orgId).eq('status', 'active').eq('is_latest_version', true);

    // Folder / scope filter
    if (activeFolder.type !== 'all') {
      if (['internal', 'shared_library', 'case_specific'].includes(activeFolder.type)) {
        query = query.eq('visibility_scope', activeFolder.type);
      } else if (activeFolder.entityId) {
        if (activeFolder.type === 'cases') query = query.eq('case_id', activeFolder.entityId);
        else if (activeFolder.type === 'errands') query = query.eq('errand_id', activeFolder.entityId);
        else if (activeFolder.type === 'clients') query = query.eq('client_id', activeFolder.entityId);
      } else {
        switch (activeFolder.type) {
          case 'cases': query = query.not('case_id', 'is', null); break;
          case 'errands': query = query.not('errand_id', 'is', null); break;
          case 'clients': query = query.not('client_id', 'is', null).is('case_id', null).is('errand_id', null); break;
          case 'templates': query = query.eq('document_category', 'template'); break;
          case 'general': query = query.is('client_id', null).is('case_id', null).is('errand_id', null).neq('document_category', 'template'); break;
        }
      }
    }

    if (searchQuery) query = query.or(`file_name.ilike.%${searchQuery}%,file_name_ar.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,title_ar.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    if (activeFilters.category && activeFilters.category !== 'all') query = query.eq('document_category', activeFilters.category);
    if (activeFilters.linkedTo && activeFilters.linkedTo !== 'all') {
      switch (activeFilters.linkedTo) {
        case 'cases': query = query.not('case_id', 'is', null); break;
        case 'errands': query = query.not('errand_id', 'is', null); break;
        case 'clients': query = query.not('client_id', 'is', null); break;
        case 'unlinked': query = query.is('client_id', null).is('case_id', null).is('errand_id', null); break;
      }
    }
    if (activeFilters.fileType && activeFilters.fileType !== 'all') {
      switch (activeFilters.fileType) {
        case 'pdf': query = query.eq('file_type', 'pdf'); break;
        case 'word': query = query.in('file_type', ['doc', 'docx']); break;
        case 'excel': query = query.in('file_type', ['xls', 'xlsx']); break;
        case 'images': query = query.in('file_type', ['jpg', 'jpeg', 'png', 'gif', 'webp']); break;
      }
    }
    query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;
    if (!error) { setDocuments(data || []); setTotalCount(count || 0); }
    setIsLoading(false);
  }, [orgId, searchQuery, activeFilters, sortConfig, page, pageSize, activeFolder]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleSort = (key: string) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  // --- Selection ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(documents.map(d => d.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // --- Bulk actions ---
  const bulkDownload = async () => {
    const selected = documents.filter(d => selectedIds.has(d.id));
    for (let i = 0; i < selected.length; i++) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(selected[i].file_path, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
        if (i < selected.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    }
    toast.success(language === 'ar' ? `بدأ تحميل ${selected.length} ملفات` : `Downloading ${selected.length} file(s)`);
  };

  const bulkSetVisibility = async (visible: boolean) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('documents').update({ is_visible_to_client: visible } as any).eq('id', id);
    }
    toast.success(visible ? t('documents.messages.sharedWithClient') : t('documents.messages.hiddenFromClient'));
    clearSelection(); refreshAll();
  };

  const bulkChangeCategory = async (category: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('documents').update({ document_category: category } as any).eq('id', id);
    }
    toast.success(language === 'ar' ? `تم تغيير التصنيف لـ ${ids.length} مستند` : `Category changed for ${ids.length} document(s)`);
    setBulkCategoryOpen(false); clearSelection(); refreshAll();
  };

  const bulkArchive = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('documents').update({ status: 'archived' } as any).eq('id', id);
    }
    toast.success(t('documents.messages.archived'));
    setBulkArchiveConfirm(false); clearSelection(); refreshAll();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('documents').update({ status: 'deleted' } as any).eq('id', id);
    }
    toast.success(t('documents.messages.deleted'));
    setBulkDeleteConfirm(false); clearSelection(); refreshAll();
  };

  // --- Single actions ---
  const toggleVisibility = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !doc.is_visible_to_client;
    await supabase.from('documents').update({ is_visible_to_client: newVal } as any).eq('id', doc.id);
    toast.success(newVal ? t('documents.messages.sharedWithClient') : t('documents.messages.hiddenFromClient'));
    fetchDocuments();
  };

  const handleDownload = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
      toast.success(t('documents.messages.downloadStarted'));
      // Log activity & update last_accessed
      await Promise.all([
        supabase.from('document_activities').insert({ document_id: doc.id, organization_id: orgId, actor_id: profile?.id, activity_type: 'downloaded', title: `Downloaded: ${doc.file_name}`, title_ar: `تم تحميل: ${doc.file_name}` } as any),
        supabase.from('documents').update({ last_accessed_at: new Date().toISOString(), last_accessed_by: profile?.id } as any).eq('id', doc.id),
      ]);
    }
  };

  const handleArchive = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('documents').update({ status: 'archived' } as any).eq('id', doc.id);
    toast.success(t('documents.messages.archived'));
    fetchDocuments(); fetchStats();
  };

  const startRename = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameValue(doc.file_name);
  };

  const confirmRename = async (docId: string) => {
    if (!renameValue.trim()) return;
    await supabase.from('documents').update({ file_name: renameValue.trim() } as any).eq('id', docId);
    await supabase.from('document_activities').insert({ document_id: docId, organization_id: orgId, actor_id: profile?.id, activity_type: 'renamed', title: `Renamed to: ${renameValue.trim()}`, title_ar: `إعادة تسمية إلى: ${renameValue.trim()}` } as any);
    toast.success(language === 'ar' ? 'تم إعادة تسمية المستند' : 'Document renamed');
    setRenamingId(null);
    fetchDocuments();
  };

  const refreshAll = () => { fetchDocuments(); fetchStats(); };

  const getLinkedEntity = (doc: any) => {
    if (doc.case) return { icon: Scale, label: doc.case.case_number, href: `/cases/${doc.case.id}` };
    if (doc.errand) return { icon: FileCheck, label: doc.errand.errand_number, href: `/errands/${doc.errand.id}` };
    if (doc.client) {
      const name = language === 'ar' ? (doc.client.client_type === 'company' ? doc.client.company_name_ar || doc.client.company_name : `${doc.client.first_name_ar || doc.client.first_name} ${doc.client.last_name_ar || doc.client.last_name}`) : (doc.client.client_type === 'company' ? doc.client.company_name : `${doc.client.first_name} ${doc.client.last_name}`);
      return { icon: User, label: name, href: `/clients/${doc.client.id}` };
    }
    return null;
  };

  const getUploaderName = (doc: any) => {
    if (!doc.uploader) return '—';
    return language === 'ar' ? `${doc.uploader.first_name_ar || doc.uploader.first_name} ${doc.uploader.last_name_ar || doc.uploader.last_name}` : `${doc.uploader.first_name} ${doc.uploader.last_name}`;
  };

  // --- Storage quota ---
  const usedMb = totalSize / (1024 * 1024);
  const storagePercent = Math.min((usedMb / maxStorageMb) * 100, 100);
  const storageColor = storagePercent > 95 ? 'bg-destructive' : storagePercent > 80 ? 'bg-warning' : 'bg-accent';

  // --- Breadcrumbs for folder ---
  const folderBreadcrumbs: { label: string; labelAr: string; href?: string }[] = [
    { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
    { label: 'Documents', labelAr: 'المستندات', href: activeFolder.type !== 'all' ? '#' : undefined },
  ];
  if (activeFolder.type !== 'all') {
    const folderLabel = activeFolder.type === 'cases' ? (language === 'ar' ? 'القضايا' : 'Cases')
      : activeFolder.type === 'errands' ? (language === 'ar' ? 'المعاملات' : 'Errands')
      : activeFolder.type === 'clients' ? (language === 'ar' ? 'العملاء' : 'Clients')
      : activeFolder.type === 'templates' ? (language === 'ar' ? 'القوالب' : 'Templates')
      : (language === 'ar' ? 'عام' : 'General');
    folderBreadcrumbs.push({ label: folderLabel, labelAr: folderLabel });
    if (activeFolder.entityLabel) {
      folderBreadcrumbs.push({ label: activeFolder.entityLabel, labelAr: activeFolder.entityLabel });
    }
  }

  const columns = [
    { key: '_select', label: '', labelAr: '', width: '4%',
      headerRender: () => <Checkbox checked={selectedIds.size > 0 && selectedIds.size === documents.length} onCheckedChange={toggleSelectAll} onClick={(e: any) => e.stopPropagation()} />,
      render: (row: any) => <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} onClick={(e: any) => e.stopPropagation()} />,
    },
    { key: 'file_name', label: 'Name', labelAr: 'الاسم', sortable: true, width: '23%',
      render: (row: any) => {
        if (renamingId === row.id) {
          return (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmRename(row.id); if (e.key === 'Escape') setRenamingId(null); }}
                onBlur={() => confirmRename(row.id)}
                className="flex-1 h-8 px-2 border border-border rounded text-body-md bg-background"
              />
            </div>
          );
        }
        const { icon: FIcon, color } = getFileIcon(row.file_type);
        const displayName = row.title || row.file_name;
        const showSubName = row.title ? row.file_name : null;
        return (<div className="flex items-center gap-2.5 min-w-0"><FIcon size={20} style={{ color }} className="shrink-0" /><div className="min-w-0"><p className="text-body-md font-medium truncate">{language === 'ar' ? (row.title_ar || displayName) : displayName}</p>{showSubName && <p className="text-body-sm text-muted-foreground truncate">{showSubName}</p>}</div></div>);
      },
    },
    { key: 'document_category', label: 'Category', labelAr: 'التصنيف', sortable: true, width: '12%',
      render: (row: any) => <span className="inline-flex items-center text-xs font-medium rounded-badge px-2.5 py-0.5 bg-muted text-muted-foreground capitalize">{t(`documents.categories.${row.document_category}`)}</span>,
    },
    { key: 'linked_to', label: 'Linked To', labelAr: 'مرتبط بـ', width: '14%',
      render: (row: any) => {
        const linked = getLinkedEntity(row);
        if (!linked) return <span className="text-muted-foreground">—</span>;
        const LIcon = linked.icon;
        return <button onClick={(e) => { e.stopPropagation(); navigate(linked.href); }} className="flex items-center gap-1.5 text-accent hover:underline text-body-sm"><LIcon size={14} /><span className="truncate">{linked.label}</span></button>;
      },
    },
    { key: 'file_size_bytes', label: 'Size', labelAr: 'الحجم', sortable: true, width: '7%',
      render: (row: any) => <span className="text-body-sm text-muted-foreground">{formatFileSize(row.file_size_bytes)}</span>,
    },
    { key: 'uploaded_by', label: 'Uploaded By', labelAr: 'رُفع بواسطة', sortable: true, width: '11%',
      render: (row: any) => {
        const name = getUploaderName(row);
        return <div className="flex items-center gap-1.5"><div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">{name.charAt(0)}</div><span className="text-body-sm truncate">{name}</span></div>;
      },
    },
    { key: 'created_at', label: 'Date', labelAr: 'التاريخ', sortable: true, width: '9%',
      render: (row: any) => <span className="text-body-sm text-muted-foreground">{format(new Date(row.created_at), 'dd/MM/yyyy')}</span>,
    },
    { key: 'version', label: 'Ver', labelAr: 'إصدار', width: '5%',
      render: (row: any) => <span className={`text-xs font-medium rounded-badge px-1.5 py-0.5 ${row.version > 1 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>v{row.version}</span>,
    },
    { key: 'visibility', label: '', labelAr: '', width: '4%',
      render: (row: any) => <button onClick={(e) => toggleVisibility(row, e)} className="p-1 rounded hover:bg-muted transition-colors">{row.is_visible_to_client ? <Eye size={16} className="text-accent" /> : <EyeOff size={16} className="text-muted-foreground/40" />}</button>,
    },
    { key: 'actions', label: '', labelAr: '', width: '5%',
      render: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><button className="p-1 rounded hover:bg-muted transition-colors"><MoreVertical size={16} /></button></DropdownMenuTrigger>
          <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
            <DropdownMenuItem onClick={(e) => handleDownload(row, e as any)}><Download size={14} className="me-2" />{language === 'ar' ? 'تحميل' : 'Download'}</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => startRename(row, e as any)}><Pencil size={14} className="me-2" />{language === 'ar' ? 'إعادة تسمية' : 'Rename'}</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => toggleVisibility(row, e as any)}>
              {row.is_visible_to_client ? <EyeOff size={14} className="me-2" /> : <Eye size={14} className="me-2" />}
              {row.is_visible_to_client ? (language === 'ar' ? 'إخفاء عن العميل' : 'Hide from Client') : (language === 'ar' ? 'مشاركة مع العميل' : 'Share with Client')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleArchive(row, e as any)}><Archive size={14} className="me-2" />{language === 'ar' ? 'أرشفة' : 'Archive'}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters = [
    { key: 'category', label: 'Category', labelAr: 'التصنيف', options: CATEGORY_OPTIONS.map(c => ({ value: c, label: t(`documents.categories.${c}`), labelAr: t(`documents.categories.${c}`) })) },
    { key: 'linkedTo', label: 'Linked To', labelAr: 'مرتبط بـ', options: [{ value: 'cases', label: 'Cases', labelAr: 'القضايا' }, { value: 'errands', label: 'Errands', labelAr: 'المعاملات' }, { value: 'clients', label: 'Clients', labelAr: 'العملاء' }, { value: 'unlinked', label: 'Unlinked', labelAr: 'غير مرتبط' }] },
    { key: 'fileType', label: 'File Type', labelAr: 'نوع الملف', options: [{ value: 'pdf', label: 'PDF', labelAr: 'PDF' }, { value: 'word', label: 'Word', labelAr: 'Word' }, { value: 'excel', label: 'Excel', labelAr: 'Excel' }, { value: 'images', label: 'Images', labelAr: 'صور' }] },
  ];

  const renderGridView = () => {
    if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-card rounded-lg border border-border animate-pulse"><div className="h-[120px] bg-muted" /><div className="p-3 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div>)}</div>;
    if (documents.length === 0) return <EmptyState icon={FileText} title={t('documents.empty.title')} titleAr={t('documents.empty.title')} subtitle={t('documents.empty.subtitle')} subtitleAr={t('documents.empty.subtitle')} actionLabel={t('documents.empty.action')} actionLabelAr={t('documents.empty.action')} onAction={() => setUploadOpen(true)} size="lg" />;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {documents.map((doc) => {
          const { icon: FIcon, color } = getFileIcon(doc.file_type);
          const displayName = language === 'ar' ? (doc.title_ar || doc.title || doc.file_name) : (doc.title || doc.file_name);
          const isSelected = selectedIds.has(doc.id);
          return (
            <div key={doc.id} className={cn('bg-card rounded-lg border overflow-hidden cursor-pointer hover:shadow-md transition-all relative', isSelected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-muted-foreground/30')} onClick={() => setDetailDocId(doc.id)}>
              <div className="absolute top-2 start-2 z-10" onClick={e => e.stopPropagation()}>
                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(doc.id)} />
              </div>
              <div className="h-[120px] bg-muted/50 flex items-center justify-center"><FIcon size={48} style={{ color }} /></div>
              <div className="p-3">
                <p className="text-body-md font-medium truncate">{displayName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-medium rounded-badge px-1.5 py-0.5 bg-muted text-muted-foreground">{t(`documents.categories.${doc.document_category}`)}</span>
                  <span className="text-body-sm text-muted-foreground">{formatFileSize(doc.file_size_bytes)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-body-sm text-muted-foreground">{format(new Date(doc.created_at), 'dd/MM/yyyy')}</span>
                  <button onClick={(e) => toggleVisibility(doc, e)} className="p-0.5">{doc.is_visible_to_client ? <Eye size={14} className="text-accent" /> : <EyeOff size={14} className="text-muted-foreground/40" />}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Bulk action bar
  const renderBulkBar = () => {
    if (selectedIds.size === 0) return null;
    return (
      <div className="bg-primary text-primary-foreground rounded-lg h-12 flex items-center justify-between px-4 mb-4 shadow-md animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-3">
          <span className="text-body-md font-medium">{selectedIds.size} {language === 'ar' ? 'محدد' : 'selected'}</span>
          <div className="h-5 w-px bg-primary-foreground/20" />
          <button onClick={bulkDownload} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-body-sm hover:bg-primary-foreground/10 transition-colors"><Download size={14} />{language === 'ar' ? 'تحميل' : 'Download'}</button>
          <DropdownMenu open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1 rounded text-body-sm hover:bg-primary-foreground/10 transition-colors"><Tag size={14} />{language === 'ar' ? 'تغيير التصنيف' : 'Change Category'}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              {CATEGORY_OPTIONS.map(c => (
                <DropdownMenuItem key={c} onClick={() => bulkChangeCategory(c)}>{t(`documents.categories.${c}`)}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={() => bulkSetVisibility(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-body-sm hover:bg-primary-foreground/10 transition-colors"><Eye size={14} />{language === 'ar' ? 'مشاركة' : 'Share'}</button>
          <button onClick={() => bulkSetVisibility(false)} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-body-sm hover:bg-primary-foreground/10 transition-colors"><EyeOff size={14} />{language === 'ar' ? 'إخفاء' : 'Hide'}</button>
          <button onClick={() => setBulkArchiveConfirm(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-body-sm hover:bg-primary-foreground/10 transition-colors"><Archive size={14} />{language === 'ar' ? 'أرشفة' : 'Archive'}</button>
          <button onClick={() => setBulkDeleteConfirm(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-body-sm hover:bg-destructive/80 transition-colors"><Trash2 size={14} />{language === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
        <button onClick={clearSelection} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-foreground/10 transition-colors text-body-sm"><X size={14} />{language === 'ar' ? 'إلغاء' : 'Clear'}</button>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title={t('documents.title')} titleAr={t('documents.title')}
        subtitle={t('documents.subtitle')} subtitleAr={t('documents.subtitle')}
        actionLabel={t('documents.upload')} actionLabelAr={t('documents.upload')}
        onAction={() => setUploadOpen(true)}
        secondaryActions={[{ label: t('documents.newFromTemplate'), labelAr: t('documents.newFromTemplate'), icon: FileText, onClick: () => setActiveTab('templates') }]}
        breadcrumbs={folderBreadcrumbs}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-0">
          <TabsTrigger value="documents" className={cn('rounded-none border-b-2 border-transparent px-5 py-3 text-body-md font-medium text-muted-foreground', 'data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent')}>
            {language === 'ar' ? 'جميع المستندات' : 'All Documents'}
          </TabsTrigger>
          <TabsTrigger value="templates" className={cn('rounded-none border-b-2 border-transparent px-5 py-3 text-body-md font-medium text-muted-foreground', 'data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent')}>
            {t('documents.templates')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-0">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 mt-6">
            <StatCard icon={FileText} iconColor="hsl(217, 91%, 60%)" iconBgColor="hsl(214, 100%, 97%)" label={t('documents.totalDocuments')} labelAr={t('documents.totalDocuments')} value={totalCount} />
            <StatCard icon={Upload} iconColor="hsl(142, 71%, 45%)" iconBgColor="hsl(138, 76%, 97%)" label={t('documents.recentUploads')} labelAr={t('documents.recentUploads')} value={recentCount} />
            <StatCard icon={HardDrive} iconColor="hsl(42, 50%, 54%)" iconBgColor="hsl(42, 52%, 95%)" label={t('documents.storageUsed')} labelAr={t('documents.storageUsed')} value={formatFileSize(totalSize)} />
          </div>

          {/* Storage Quota Bar */}
          <div className="mb-6 px-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', storageColor)} style={{ width: `${storagePercent}%` }} />
            </div>
            <p className={cn('text-body-sm mt-1', storagePercent > 95 ? 'text-destructive font-medium' : storagePercent > 80 ? 'text-warning' : 'text-muted-foreground')}>
              {storagePercent > 95
                ? (language === 'ar' ? 'المساحة شبه ممتلئة! قم بترقية خطتك.' : 'Storage almost full! Upgrade your plan.')
                : `${formatFileSize(totalSize)} ${language === 'ar' ? 'من' : 'of'} ${maxStorageMb >= 1024 ? `${(maxStorageMb / 1024).toFixed(1)} GB` : `${maxStorageMb} MB`} ${language === 'ar' ? 'مستخدم' : 'used'}`
              }
            </p>
          </div>

          {/* Mobile folder button */}
          <div className="lg:hidden mb-4">
            <Button variant="outline" size="sm" onClick={() => {/* Could open a sheet - simplified for now */}}>
              <FolderOpen size={14} className="me-1.5" />{language === 'ar' ? 'المجلدات' : 'Folders'}
              {activeFolder.type !== 'all' && <span className="ms-1.5 text-accent">• {activeFolder.entityLabel || activeFolder.type}</span>}
            </Button>
          </div>

          <div className="flex gap-0">
            {/* Folder Sidebar */}
            <DocumentFolderSidebar activeFolder={activeFolder} onFolderChange={(f) => { setActiveFolder(f); setPage(1); clearSelection(); }} />

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <FilterBar
                searchPlaceholder={t('documents.search.placeholder')} searchPlaceholderAr={t('documents.search.placeholder')}
                onSearchChange={setSearchQuery} filters={filters} activeFilters={activeFilters}
                onFilterChange={(key, value) => { setActiveFilters(prev => ({ ...prev, [key]: value })); setPage(1); }}
                onClearAll={() => { setActiveFilters({}); setPage(1); }}
                viewOptions={[{ key: 'table', icon: List, label: 'Table' }, { key: 'grid', icon: LayoutGrid, label: 'Grid' }]}
                activeView={viewMode} onViewChange={setViewMode}
              />

              {renderBulkBar()}

              {viewMode === 'table' ? (
                <DataTable columns={columns} data={documents} isLoading={isLoading} sortConfig={sortConfig} onSort={handleSort}
                  onRowClick={(row) => setDetailDocId(row.id)}
                  pagination={{ page, pageSize, total: totalCount, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}
                  emptyState={{ icon: FileText, title: t('documents.empty.title'), titleAr: t('documents.empty.title'), subtitle: t('documents.empty.subtitle'), subtitleAr: t('documents.empty.subtitle'), actionLabel: t('documents.empty.action'), actionLabelAr: t('documents.empty.action'), onAction: () => setUploadOpen(true) }}
                />
              ) : renderGridView()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <DocumentTemplatesView onDocumentSaved={refreshAll} />
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={refreshAll} />

      {/* Detail SlideOver */}
      <DocumentDetailSlideOver documentId={detailDocId} isOpen={!!detailDocId} onClose={() => setDetailDocId(null)} onRefresh={refreshAll} />

      {/* Bulk confirm dialogs */}
      <ConfirmDialog isOpen={bulkArchiveConfirm} onClose={() => setBulkArchiveConfirm(false)} onConfirm={bulkArchive}
        title={language === 'ar' ? 'أرشفة المستندات' : 'Archive Documents'} titleAr="أرشفة المستندات"
        message={language === 'ar' ? `هل أنت متأكد من أرشفة ${selectedIds.size} مستند؟` : `Are you sure you want to archive ${selectedIds.size} document(s)?`}
        messageAr={`هل أنت متأكد من أرشفة ${selectedIds.size} مستند؟`} type="warning" />
      <ConfirmDialog isOpen={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} onConfirm={bulkDelete}
        title={t('documents.messages.deleteConfirmTitle')} titleAr={t('documents.messages.deleteConfirmTitle')}
        message={language === 'ar' ? `هل أنت متأكد من حذف ${selectedIds.size} مستند؟ لا يمكن التراجع.` : `Are you sure you want to delete ${selectedIds.size} document(s)? This cannot be undone.`}
        messageAr={`هل أنت متأكد من حذف ${selectedIds.size} مستند؟ لا يمكن التراجع.`} type="danger" />
    </div>
  );
}
