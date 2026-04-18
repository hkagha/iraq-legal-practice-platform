import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Download, Upload, Loader2, FileText } from 'lucide-react';
import DocumentCommentsTab from '@/components/documents/DocumentCommentsTab';

interface Props {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalDocumentDetailSlideOver({ documentId, isOpen, onClose, onRefresh }: Props) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [doc, setDoc] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDoc = async () => {
    if (!documentId) return;
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*, cases(case_number,title,title_ar), errands(errand_number,title,title_ar)')
      .eq('id', documentId)
      .maybeSingle();
    if (data) {
      setDoc(data);
      const rootId = data.parent_document_id || data.id;
      const { data: vs } = await supabase
        .from('documents')
        .select('id,file_name,version,file_size_bytes,created_at,is_latest_version,uploaded_by')
        .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
        .order('version', { ascending: false });
      setVersions(vs || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!documentId || !isOpen) { setDoc(null); return; }
    fetchDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, isOpen]);

  const handleDownload = async () => {
    if (!doc) return;
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) { toast.error(error?.message || 'Failed'); return; }
    await supabase.from('document_activities').insert({
      document_id: doc.id, organization_id: doc.organization_id, actor_id: profile?.id,
      activity_type: 'downloaded', title: 'Downloaded by client', title_ar: 'تم التحميل من العميل',
    } as any);
    window.open(data.signedUrl, '_blank');
  };

  const handleUploadVersion = async (file: File) => {
    if (!doc || !profile?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(language === 'ar' ? 'الملف كبير جداً (الحد ١٠MB)' : 'File too large (10MB max)'); return; }
    setUploading(true);
    try {
      const orgId = doc.organization_id;
      const clientLink = await supabase.from('client_user_links').select('client_id').eq('user_id', profile.id).maybeSingle();
      const clientId = clientLink.data?.client_id;
      if (!clientId) throw new Error(language === 'ar' ? 'لا يوجد ربط بالعميل' : 'No client link found');

      const rootId = doc.parent_document_id || doc.id;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const newPath = `${orgId}/clients/${clientId}/${rootId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(newPath, file, { contentType: file.type });
      if (upErr) throw new Error(`Storage: ${upErr.message}`);

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const { error: insertErr } = await supabase.from('documents').insert({
        organization_id: orgId,
        file_name: file.name,
        file_path: newPath,
        file_size_bytes: file.size,
        file_type: ext,
        mime_type: file.type,
        document_category: doc.document_category,
        title: doc.title,
        title_ar: doc.title_ar,
        case_id: doc.case_id,
        errand_id: doc.errand_id,
        client_id: doc.client_id,
        is_visible_to_client: true,
        visibility_scope: 'case_specific',
        parent_document_id: rootId,
        version: (doc.version || 1) + 1,
        is_latest_version: true,
        uploaded_by: profile.id,
      } as any);
      if (insertErr) throw new Error(`Database: ${insertErr.message}`);

      toast.success(language === 'ar' ? 'تم رفع الإصدار الجديد' : 'New version uploaded');
      await fetchDoc();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const displayName = doc ? (language === 'ar' && doc.title_ar ? doc.title_ar : doc.title || doc.file_name) : '';

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={displayName} titleAr={displayName} width="lg">
      {loading || !doc ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            <FileText size={28} className="text-muted-foreground shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-medium truncate">{displayName}</p>
              <p className="text-body-sm text-muted-foreground">
                v{doc.version} • {formatFileSize(doc.file_size_bytes)} • {format(new Date(doc.created_at), 'dd/MM/yyyy')}
              </p>
              {doc.cases?.case_number && <p className="text-body-sm text-muted-foreground mt-0.5">{language === 'ar' ? 'قضية' : 'Case'}: {doc.cases.case_number}</p>}
              {doc.errands?.errand_number && <p className="text-body-sm text-muted-foreground mt-0.5">{language === 'ar' ? 'معاملة' : 'Errand'}: {doc.errands.errand_number}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleDownload} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Download size={14} className="me-1.5" /> {language === 'ar' ? 'تحميل' : 'Download'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadVersion(f); e.target.value = ''; }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin me-1.5" /> : <Upload size={14} className="me-1.5" />}
              {language === 'ar' ? 'رفع إصدار جديد' : 'Upload New Version'}
            </Button>
          </div>

          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments">{language === 'ar' ? 'التعليقات' : 'Comments'}</TabsTrigger>
              <TabsTrigger value="versions">{language === 'ar' ? 'الإصدارات' : 'Versions'} ({versions.length || 1})</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="pt-4">
              <DocumentCommentsTab
                documentId={doc.id}
                organizationId={doc.organization_id}
                variant="client"
                documentVisibleToClient
              />
            </TabsContent>
            <TabsContent value="versions" className="pt-4">
              <div className="space-y-2">
                {versions.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'إصدار واحد فقط' : 'Only one version'}</p>
                ) : versions.map((v) => (
                  <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg border ${v.is_latest_version ? 'border-accent/50 bg-accent/5' : 'border-border'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-medium rounded-badge px-1.5 py-0.5 ${v.is_latest_version ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>v{v.version}</span>
                      <span className="text-body-sm truncate">{v.file_name}</span>
                    </div>
                    <span className="text-body-sm text-muted-foreground">{format(new Date(v.created_at), 'dd/MM/yyyy')}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </SlideOver>
  );
}
