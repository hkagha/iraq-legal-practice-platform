import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import {
  Download, Eye, EyeOff, FileText, File, Image, Sheet, FileType,
  Scale, FileCheck, User, Upload, MoreVertical, Archive, Trash2, Loader2,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import AIContractReview from '@/components/ai/AIContractReview';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DocumentCommentsTab from '@/components/documents/DocumentCommentsTab';
import DocumentAIIndexPanel from '@/components/documents/DocumentAIIndexPanel';
import { downloadDocumentById, getDocumentSignedUrl } from '@/lib/documentAccess';

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

interface DocumentDetailSlideOverProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function DocumentDetailSlideOver({ documentId, isOpen, onClose, onRefresh }: DocumentDetailSlideOverProps) {
  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [docTextContent, setDocTextContent] = useState<string>('');

  useEffect(() => {
    if (!documentId || !isOpen) return;
    setLoading(true);
    const fetchDoc = async () => {
      const { data } = await supabase
        .from('documents')
        .select(`*, uploader:profiles!documents_uploaded_by_fkey(id,first_name,last_name,first_name_ar,last_name_ar,avatar_url), person:persons(id,first_name,last_name,first_name_ar,last_name_ar), entity:entities(id,company_name,company_name_ar), case:cases(id,case_number,title,title_ar), errand:errands(id,errand_number,title,title_ar)`)
        .eq('id', documentId).single();
      if (data) {
        setDoc(data);
        try {
          const signedUrl = await getDocumentSignedUrl(data.id);
          setPreviewUrl(signedUrl);
          // Try to fetch text content for AI review
          if (['txt', 'text'].includes(data.file_type?.toLowerCase())) {
            try {
              const resp = await fetch(signedUrl);
              const text = await resp.text();
              setDocTextContent(text);
            } catch {}
          }
        } catch {
          setPreviewUrl(null);
        }
        // Get versions
        if (data.parent_document_id || data.version > 1) {
          const rootId = data.parent_document_id || data.id;
          const { data: vs } = await supabase.from('documents').select('id,file_name,version,file_size_bytes,created_at,is_latest_version,uploaded_by,profiles:profiles!documents_uploaded_by_fkey(first_name,last_name)')
            .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`).order('version', { ascending: false });
          setVersions(vs || []);
        }
        // Get activities
        const { data: acts } = await supabase.from('document_activities').select('*').eq('document_id', documentId).order('created_at', { ascending: false }).limit(20);
        setActivities(acts || []);
      }
      setLoading(false);
    };
    fetchDoc();
  }, [documentId, isOpen]);

  const handleDownload = async () => {
    if (!doc) return;
    await downloadDocumentById(doc.id, doc.file_name);
    toast.success(t('documents.messages.downloadStarted'));
    await supabase.from('document_activities').insert({ document_id: doc.id, organization_id: doc.organization_id, actor_id: profile?.id, activity_type: 'downloaded', title: `Downloaded: ${doc.file_name}`, title_ar: `تم تحميل: ${doc.file_name}` } as any);
  };

  const toggleVisibility = async () => {
    if (!doc) return;
    const newVal = !doc.is_visible_to_client;
    await supabase.from('documents').update({ is_visible_to_client: newVal } as any).eq('id', doc.id);
    setDoc((prev: any) => ({ ...prev, is_visible_to_client: newVal }));
    toast.success(newVal ? t('documents.messages.sharedWithClient') : t('documents.messages.hiddenFromClient'));
    onRefresh();
  };

  const handleArchive = async () => {
    if (!doc) return;
    await supabase.from('documents').update({ status: 'archived' } as any).eq('id', doc.id);
    toast.success(t('documents.messages.archived'));
    onClose(); onRefresh();
  };

  const handleDelete = async () => {
    if (!doc) return;
    await supabase.from('documents').update({
      status: 'archived',
      case_id: null,
      errand_id: null,
      is_visible_to_client: false,
    } as any).eq('id', doc.id);
    toast.success(t('documents.messages.archived'));
    setDeleteConfirm(false); onClose(); onRefresh();
  };

  if (!doc && loading) {
    return <SlideOver isOpen={isOpen} onClose={onClose} title="" titleAr="" width="xl">
      <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
    </SlideOver>;
  }

  if (!doc) return null;

  const ext = doc.file_type?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isPdf = ext === 'pdf';
  const iconConfig = FILE_TYPE_ICONS[ext] || { icon: FileText, color: '#64748B' };
  const FIcon = iconConfig.icon;
  const displayName = language === 'ar' ? (doc.title_ar || doc.title || doc.file_name) : (doc.title || doc.file_name);
  const uploaderName = doc.uploader ? (language === 'ar' && doc.uploader.first_name_ar ? `${doc.uploader.first_name_ar} ${doc.uploader.last_name_ar || ''}` : `${doc.uploader.first_name} ${doc.uploader.last_name}`) : '—';

  const getPartyName = () => {
    if (doc.entity) return language === 'ar' && doc.entity.company_name_ar ? doc.entity.company_name_ar : doc.entity.company_name;
    if (doc.person) return language === 'ar' && doc.person.first_name_ar ? `${doc.person.first_name_ar} ${doc.person.last_name_ar || ''}`.trim() : `${doc.person.first_name || ''} ${doc.person.last_name || ''}`.trim();
    return null;
  };

  return (
    <>
      <SlideOver isOpen={isOpen} onClose={onClose} title={displayName} titleAr={displayName}
        subtitle={`${t(`documents.categories.${doc.document_category}`)} • v${doc.version} • ${formatFileSize(doc.file_size_bytes)}`}
        subtitleAr={`${t(`documents.categories.${doc.document_category}`)} • v${doc.version} • ${formatFileSize(doc.file_size_bytes)}`}
        width="xl"
        footer={
          <div className="flex items-center gap-2 w-full justify-end">
            <Button onClick={handleDownload} className="bg-accent text-accent-foreground hover:bg-accent/90"><Download size={14} className="me-1.5" />{language === 'ar' ? 'تحميل' : 'Download'}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical size={16} /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                <DropdownMenuItem onClick={toggleVisibility}>
                  {doc.is_visible_to_client ? <EyeOff size={14} className="me-2" /> : <Eye size={14} className="me-2" />}
                  {doc.is_visible_to_client ? (language === 'ar' ? 'إخفاء عن العميل' : 'Hide from Client') : (language === 'ar' ? 'مشاركة مع العميل' : 'Share with Client')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}><Archive size={14} className="me-2" />{language === 'ar' ? 'أرشفة' : 'Archive'}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} className="me-2" />{language === 'ar' ? 'حذف' : 'Delete'}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">{language === 'ar' ? 'التفاصيل' : 'Details'}</TabsTrigger>
            <TabsTrigger value="comments">{language === 'ar' ? 'التعليقات' : 'Comments'}</TabsTrigger>
          </TabsList>
          <TabsContent value="comments">
            <DocumentCommentsTab
              documentId={doc.id}
              organizationId={doc.organization_id}
              variant="staff"
              documentVisibleToClient={doc.is_visible_to_client}
            />
          </TabsContent>
          <TabsContent value="details" className="space-y-6">
          {/* Preview */}
          <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
            {isPdf && previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[400px]" title="PDF Preview" />
            ) : isImage && previewUrl ? (
              <div className="flex items-center justify-center p-4 max-h-[400px]">
                <img src={previewUrl} alt={doc.file_name} className="max-h-[380px] object-contain rounded" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                <FIcon size={64} style={{ color: iconConfig.color }} />
                <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'المعاينة غير متاحة لهذا النوع' : 'Preview not available for this file type'}</p>
                <Button variant="outline" size="sm" onClick={handleDownload}><Download size={14} className="me-1" />{language === 'ar' ? 'تحميل' : 'Download'}</Button>
              </div>
            )}
          </div>

          {/* AI extracted metadata */}
          <DocumentAIIndexPanel
            document={doc}
            onChanged={async () => {
              const { data } = await supabase.from('documents').select('*').eq('id', doc.id).maybeSingle();
              if (data) setDoc((prev: any) => ({ ...prev, ...data }));
              onRefresh();
            }}
          />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.fileName')}</span><span className="text-body-md">{doc.file_name}</span></div>
              {doc.title && <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.title')}</span><span className="text-body-md font-medium">{displayName}</span></div>}
              {doc.description && <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.description')}</span><span className="text-body-md text-muted-foreground">{doc.description}</span></div>}
              <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.category')}</span>
                <span className="inline-flex text-xs font-medium rounded-badge px-2.5 py-0.5 bg-muted text-muted-foreground">{t(`documents.categories.${doc.document_category}`)}</span>
              </div>
              {doc.tags?.length > 0 && (
                <div><span className="text-body-sm text-muted-foreground block mb-1">{t('documents.fields.tags')}</span>
                  <div className="flex flex-wrap gap-1">{doc.tags.map((tag: string) => <span key={tag} className="text-xs bg-muted rounded-full px-2 py-0.5">{tag}</span>)}</div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.uploadedBy')}</span>
                <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-medium text-accent">{uploaderName[0]}</div><span className="text-body-md">{uploaderName}</span></div>
              </div>
              <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.uploadedAt')}</span><span className="text-body-md">{format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}</span></div>
              <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.size')}</span><span className="text-body-md">{formatFileSize(doc.file_size_bytes)}</span></div>
              <div><span className="text-body-sm text-muted-foreground block">{t('documents.fields.version')}</span><span className="text-body-md">v{doc.version}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-muted-foreground">{t('documents.fields.visibleToClient')}</span>
                <Switch checked={doc.is_visible_to_client} onCheckedChange={toggleVisibility} />
              </div>
            </div>
          </div>

          {/* Linked entities */}
          {(doc.person || doc.entity || doc.case || doc.errand) && (
            <div className="border-t border-border pt-4">
              <h4 className="text-heading-sm font-semibold mb-3">{language === 'ar' ? 'مرتبط بـ' : 'Linked To'}</h4>
              <div className="space-y-2">
                {(doc.person || doc.entity) && (
                  <button onClick={() => navigate(`/clients/${doc.person?.id || doc.entity?.id}?type=${doc.person ? 'person' : 'entity'}`)} className="flex items-center gap-2 text-accent hover:underline text-body-md">
                    <User size={14} /> {getPartyName()}
                  </button>
                )}
                {doc.case && (
                  <button onClick={() => navigate(`/cases/${doc.case.id}`)} className="flex items-center gap-2 text-accent hover:underline text-body-md">
                    <Scale size={14} /> {doc.case.case_number} — {language === 'ar' && doc.case.title_ar ? doc.case.title_ar : doc.case.title}
                  </button>
                )}
                {doc.errand && (
                  <button onClick={() => navigate(`/errands/${doc.errand.id}`)} className="flex items-center gap-2 text-accent hover:underline text-body-md">
                    <FileCheck size={14} /> {doc.errand.errand_number} — {language === 'ar' && doc.errand.title_ar ? doc.errand.title_ar : doc.errand.title}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Version History */}
          {versions.length > 1 && (
            <div className="border-t border-border pt-4">
              <h4 className="text-heading-sm font-semibold mb-3">{t('documents.version.history')}</h4>
              <div className="space-y-2">
                {versions.map((v: any) => (
                  <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg border ${v.is_latest_version ? 'border-accent/50 bg-accent/5' : 'border-border'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium rounded-badge px-1.5 py-0.5 ${v.is_latest_version ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>v{v.version}</span>
                      <span className="text-body-sm">{v.file_name}</span>
                      <span className="text-body-sm text-muted-foreground">{formatFileSize(v.file_size_bytes)}</span>
                    </div>
                    <span className="text-body-sm text-muted-foreground">{format(new Date(v.created_at), 'dd/MM/yyyy')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {activities.length > 0 && (
            <div className="border-t border-border pt-4">
              <h4 className="text-heading-sm font-semibold mb-3">{language === 'ar' ? 'النشاط' : 'Activity'}</h4>
              <div className="space-y-2">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-body-sm">{language === 'ar' && a.title_ar ? a.title_ar : a.title}</p>
                      <p className="text-body-sm text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Contract Review — for contracts/drafts */}
          {doc && ['contract', 'draft'].includes(doc.document_category) && docTextContent && (
            <AIContractReview
              documentContent={docTextContent}
              documentTitle={displayName}
              caseData={doc.case ? { title: doc.case.title, case_type: 'N/A' } : undefined}
            />
          )}
          </TabsContent>
        </Tabs>
      </SlideOver>

      <ConfirmDialog isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} onConfirm={handleDelete}
        title={t('documents.messages.deleteConfirmTitle')} titleAr={t('documents.messages.deleteConfirmTitle')}
        message={t('documents.messages.deleteConfirmMessage')} messageAr={t('documents.messages.deleteConfirmMessage')} type="danger" />
    </>
  );
}
