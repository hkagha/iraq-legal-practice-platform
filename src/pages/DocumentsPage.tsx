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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  FileText, Upload, HardDrive, LayoutGrid, List,
  FileType, File, Image, Sheet, MoreVertical, Download,
  Eye, EyeOff, Archive, Trash2, Scale, FileCheck, User
} from 'lucide-react';
import DocumentUploadModal from '@/components/documents/DocumentUploadModal';
import DocumentDetailSlideOver from '@/components/documents/DocumentDetailSlideOver';
import DocumentTemplatesView from '@/components/documents/DocumentTemplatesView';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<string>('table');
  const [activeTab, setActiveTab] = useState('documents');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' as 'asc' | 'desc' });

  // Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailDocId, setDetailDocId] = useState<string | null>(null);

  const orgId = profile?.organization_id;

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
  }, [orgId, searchQuery, activeFilters, sortConfig, page, pageSize]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleSort = (key: string) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

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
    if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); toast.success(t('documents.messages.downloadStarted')); }
  };

  const handleArchive = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('documents').update({ status: 'archived' } as any).eq('id', doc.id);
    toast.success(t('documents.messages.archived'));
    fetchDocuments(); fetchStats();
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

  const columns = [
    { key: 'file_name', label: 'Name', labelAr: 'الاسم', sortable: true, width: '25%',
      render: (row: any) => {
        const { icon: FIcon, color } = getFileIcon(row.file_type);
        const displayName = row.title || row.file_name;
        const showSubName = row.title ? row.file_name : null;
        return (<div className="flex items-center gap-2.5 min-w-0"><FIcon size={20} style={{ color }} className="shrink-0" /><div className="min-w-0"><p className="text-body-md font-medium truncate">{language === 'ar' ? (row.title_ar || displayName) : displayName}</p>{showSubName && <p className="text-body-sm text-muted-foreground truncate">{showSubName}</p>}</div></div>);
      },
    },
    { key: 'document_category', label: 'Category', labelAr: 'التصنيف', sortable: true, width: '12%',
      render: (row: any) => <span className="inline-flex items-center text-xs font-medium rounded-badge px-2.5 py-0.5 bg-muted text-muted-foreground capitalize">{t(`documents.categories.${row.document_category}`)}</span>,
    },
    { key: 'linked_to', label: 'Linked To', labelAr: 'مرتبط بـ', width: '15%',
      render: (row: any) => {
        const linked = getLinkedEntity(row);
        if (!linked) return <span className="text-muted-foreground">—</span>;
        const LIcon = linked.icon;
        return <button onClick={(e) => { e.stopPropagation(); navigate(linked.href); }} className="flex items-center gap-1.5 text-accent hover:underline text-body-sm"><LIcon size={14} /><span className="truncate">{linked.label}</span></button>;
      },
    },
    { key: 'file_size_bytes', label: 'Size', labelAr: 'الحجم', sortable: true, width: '8%',
      render: (row: any) => <span className="text-body-sm text-muted-foreground">{formatFileSize(row.file_size_bytes)}</span>,
    },
    { key: 'uploaded_by', label: 'Uploaded By', labelAr: 'رُفع بواسطة', sortable: true, width: '12%',
      render: (row: any) => {
        const name = getUploaderName(row);
        return <div className="flex items-center gap-1.5"><div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">{name.charAt(0)}</div><span className="text-body-sm truncate">{name}</span></div>;
      },
    },
    { key: 'created_at', label: 'Date', labelAr: 'التاريخ', sortable: true, width: '10%',
      render: (row: any) => <span className="text-body-sm text-muted-foreground">{format(new Date(row.created_at), 'dd/MM/yyyy')}</span>,
    },
    { key: 'version', label: 'Version', labelAr: 'الإصدار', width: '6%',
      render: (row: any) => <span className={`text-xs font-medium rounded-badge px-1.5 py-0.5 ${row.version > 1 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>v{row.version}</span>,
    },
    { key: 'visibility', label: 'Visible', labelAr: 'مرئي', width: '6%',
      render: (row: any) => <button onClick={(e) => toggleVisibility(row, e)} className="p-1 rounded hover:bg-muted transition-colors">{row.is_visible_to_client ? <Eye size={16} className="text-accent" /> : <EyeOff size={16} className="text-muted-foreground/40" />}</button>,
    },
    { key: 'actions', label: '', labelAr: '', width: '6%',
      render: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><button className="p-1 rounded hover:bg-muted transition-colors"><MoreVertical size={16} /></button></DropdownMenuTrigger>
          <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
            <DropdownMenuItem onClick={(e) => handleDownload(row, e as any)}><Download size={14} className="me-2" />{language === 'ar' ? 'تحميل' : 'Download'}</DropdownMenuItem>
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
          return (
            <div key={doc.id} className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer hover:shadow-md hover:border-muted-foreground/30 transition-all" onClick={() => setDetailDocId(doc.id)}>
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

  return (
    <div>
      <PageHeader
        title={t('documents.title')} titleAr={t('documents.title')}
        subtitle={t('documents.subtitle')} subtitleAr={t('documents.subtitle')}
        actionLabel={t('documents.upload')} actionLabelAr={t('documents.upload')}
        onAction={() => setUploadOpen(true)}
        secondaryActions={[{ label: t('documents.newFromTemplate'), labelAr: t('documents.newFromTemplate'), icon: FileText, onClick: () => setActiveTab('templates') }]}
        breadcrumbs={[{ label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' }, { label: 'Documents', labelAr: 'المستندات' }]}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 mt-6">
            <StatCard icon={FileText} iconColor="hsl(217, 91%, 60%)" iconBgColor="hsl(214, 100%, 97%)" label={t('documents.totalDocuments')} labelAr={t('documents.totalDocuments')} value={totalCount} />
            <StatCard icon={Upload} iconColor="hsl(142, 71%, 45%)" iconBgColor="hsl(138, 76%, 97%)" label={t('documents.recentUploads')} labelAr={t('documents.recentUploads')} value={recentCount} />
            <StatCard icon={HardDrive} iconColor="hsl(42, 50%, 54%)" iconBgColor="hsl(42, 52%, 95%)" label={t('documents.storageUsed')} labelAr={t('documents.storageUsed')} value={formatFileSize(totalSize)} />
          </div>

          <FilterBar
            searchPlaceholder={t('documents.search.placeholder')} searchPlaceholderAr={t('documents.search.placeholder')}
            onSearchChange={setSearchQuery} filters={filters} activeFilters={activeFilters}
            onFilterChange={(key, value) => { setActiveFilters(prev => ({ ...prev, [key]: value })); setPage(1); }}
            onClearAll={() => { setActiveFilters({}); setPage(1); }}
            viewOptions={[{ key: 'table', icon: List, label: 'Table' }, { key: 'grid', icon: LayoutGrid, label: 'Grid' }]}
            activeView={viewMode} onViewChange={setViewMode}
          />

          {viewMode === 'table' ? (
            <DataTable columns={columns} data={documents} isLoading={isLoading} sortConfig={sortConfig} onSort={handleSort}
              onRowClick={(row) => setDetailDocId(row.id)}
              pagination={{ page, pageSize, total: totalCount, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}
              emptyState={{ icon: FileText, title: t('documents.empty.title'), titleAr: t('documents.empty.title'), subtitle: t('documents.empty.subtitle'), subtitleAr: t('documents.empty.subtitle'), actionLabel: t('documents.empty.action'), actionLabelAr: t('documents.empty.action'), onAction: () => setUploadOpen(true) }}
            />
          ) : renderGridView()}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <DocumentTemplatesView onDocumentSaved={refreshAll} />
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={refreshAll} />

      {/* Detail SlideOver */}
      <DocumentDetailSlideOver documentId={detailDocId} isOpen={!!detailDocId} onClose={() => setDetailDocId(null)} onRefresh={refreshAll} />
    </div>
  );
}
