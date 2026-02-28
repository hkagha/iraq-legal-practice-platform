import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  FileText, Upload, Download, Eye, EyeOff, FileType, File, Image, Sheet,
  MoreVertical, Archive,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentDetailSlideOver from './DocumentDetailSlideOver';

const FILE_TYPE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileType, color: '#EF4444' },
  doc: { icon: File, color: '#3B82F6' }, docx: { icon: File, color: '#3B82F6' },
  xls: { icon: Sheet, color: '#22C55E' }, xlsx: { icon: Sheet, color: '#22C55E' },
  jpg: { icon: Image, color: '#8B5CF6' }, jpeg: { icon: Image, color: '#8B5CF6' },
  png: { icon: Image, color: '#8B5CF6' }, gif: { icon: Image, color: '#8B5CF6' },
  webp: { icon: Image, color: '#8B5CF6' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface EntityDocumentsTabProps {
  entityType: 'case' | 'errand' | 'client';
  entityId: string;
  entityName?: string;
  caseInfo?: { id: string; case_number: string; title: string };
  errandInfo?: { id: string; errand_number: string; title: string };
  clientInfo?: { id: string; name: string };
}

export default function EntityDocumentsTab({ entityType, entityId, caseInfo, errandInfo, clientInfo }: EntityDocumentsTabProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailDocId, setDetailDocId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!entityId || !profile?.organization_id) return;
    setLoading(true);
    let query = supabase
      .from('documents')
      .select(`*, uploader:profiles!documents_uploaded_by_fkey(first_name,last_name,first_name_ar,last_name_ar)`)
      .eq('organization_id', profile.organization_id)
      .eq('status', 'active')
      .eq('is_latest_version', true)
      .order('created_at', { ascending: false });

    if (entityType === 'case') query = query.eq('case_id', entityId);
    else if (entityType === 'errand') query = query.eq('errand_id', entityId);
    else query = query.eq('client_id', entityId);

    const { data } = await query;
    setDocuments(data || []);
    setLoading(false);
  }, [entityId, entityType, profile?.organization_id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDownload = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); toast.success(t('documents.messages.downloadStarted')); }
  };

  const toggleVisibility = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !doc.is_visible_to_client;
    await supabase.from('documents').update({ is_visible_to_client: newVal } as any).eq('id', doc.id);
    toast.success(newVal ? t('documents.messages.sharedWithClient') : t('documents.messages.hiddenFromClient'));
    fetchDocs();
  };

  const preLinkedCase = entityType === 'case' && caseInfo ? caseInfo : undefined;
  const preLinkedErrand = entityType === 'errand' && errandInfo ? errandInfo : undefined;
  const preLinkedClient = entityType === 'client' && clientInfo ? clientInfo : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading-lg font-semibold text-foreground">
          {entityType === 'case' ? (language === 'ar' ? 'مستندات القضية' : 'Case Documents') :
           entityType === 'errand' ? (language === 'ar' ? 'مستندات المعاملة' : 'Errand Documents') :
           (language === 'ar' ? 'مستندات العميل' : 'Client Documents')}
        </h3>
        <Button onClick={() => setUploadOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Upload size={14} className="me-1.5" /> {t('documents.upload')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : documents.length === 0 ? (
        <EmptyState icon={FileText}
          title={entityType === 'case' ? (language === 'ar' ? 'لا مستندات لهذه القضية' : 'No documents for this case') :
                 entityType === 'errand' ? (language === 'ar' ? 'لا مستندات لهذه المعاملة' : 'No documents for this errand') :
                 (language === 'ar' ? 'لا مستندات لهذا العميل' : 'No documents for this client')}
          titleAr=""
          actionLabel={t('documents.upload')} actionLabelAr={t('documents.upload')}
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3">{t('documents.fields.fileName')}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[15%]">{t('documents.fields.category')}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[10%]">{t('documents.fields.size')}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[12%]">{t('documents.fields.uploadedAt')}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3 w-[6%]"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => {
                const ext = doc.file_type?.toLowerCase() || '';
                const iconConfig = FILE_TYPE_ICONS[ext] || { icon: FileText, color: '#64748B' };
                const FIcon = iconConfig.icon;
                const displayName = language === 'ar' ? (doc.title_ar || doc.title || doc.file_name) : (doc.title || doc.file_name);
                return (
                  <tr key={doc.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setDetailDocId(doc.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><FIcon size={18} style={{ color: iconConfig.color }} /><span className="text-body-md font-medium truncate">{displayName}</span></div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs font-medium rounded-badge px-2 py-0.5 bg-muted text-muted-foreground">{t(`documents.categories.${doc.document_category}`)}</span></td>
                    <td className="px-4 py-3 text-body-sm text-muted-foreground">{formatFileSize(doc.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-body-sm text-muted-foreground">{format(new Date(doc.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><button className="p-1 rounded hover:bg-muted"><MoreVertical size={16} /></button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={(e) => handleDownload(doc, e as any)}><Download size={14} className="me-2" />{language === 'ar' ? 'تحميل' : 'Download'}</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => toggleVisibility(doc, e as any)}>{doc.is_visible_to_client ? <EyeOff size={14} className="me-2" /> : <Eye size={14} className="me-2" />}{doc.is_visible_to_client ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'مشاركة' : 'Share')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={fetchDocs}
        preLinkedCase={preLinkedCase} preLinkedErrand={preLinkedErrand} preLinkedClient={preLinkedClient} />
      <DocumentDetailSlideOver documentId={detailDocId} isOpen={!!detailDocId} onClose={() => setDetailDocId(null)} onRefresh={fetchDocs} />
    </div>
  );
}
