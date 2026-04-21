import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, File as FileIcon, Image as ImageIcon, Sheet, FileType,
  Loader2, Upload, X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageLoader } from '@/components/ui/PageLoader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DocumentCommentsTab from '@/components/documents/DocumentCommentsTab';
import { downloadDocumentById, getDocumentSignedUrl } from '@/lib/documentAccess';

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileType, color: '#EF4444' },
  doc: { icon: FileIcon, color: '#3B82F6' }, docx: { icon: FileIcon, color: '#3B82F6' },
  xls: { icon: Sheet, color: '#22C55E' }, xlsx: { icon: Sheet, color: '#22C55E' },
  jpg: { icon: ImageIcon, color: '#8B5CF6' }, jpeg: { icon: ImageIcon, color: '#8B5CF6' },
  png: { icon: ImageIcon, color: '#8B5CF6' }, gif: { icon: ImageIcon, color: '#8B5CF6' },
  webp: { icon: ImageIcon, color: '#8B5CF6' },
};

const MAX_REPLY_BYTES = 25 * 1024 * 1024; // 25 MB

function fmtSize(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function safeName(n: string) {
  return n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

export default function PortalDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const { language, isRTL } = useLanguage();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the document — RLS guarantees it's shared with this client
  const { data: doc, isLoading } = useQuery({
    queryKey: ['portal-document', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, organization_id, file_name, file_name_ar, title, title_ar, file_type, file_size_bytes, file_path, mime_type, created_at, case_id, person_id, entity_id, party_type, is_visible_to_client, status')
        .eq('id', id!)
        .eq('is_visible_to_client', true)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch a signed preview URL when the doc loads
  useEffect(() => {
    if (!doc?.file_path) return;
    let cancelled = false;
    (async () => {
      try {
        const signedUrl = await getDocumentSignedUrl(doc.id);
        if (!cancelled) setPreviewUrl(signedUrl);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [doc?.id, doc?.file_path]);

  const ext = (doc?.file_type || '').toLowerCase();
  const iconCfg = FILE_ICONS[ext] || { icon: FileText, color: '#64748B' };
  const FIcon = iconCfg.icon;
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

  const displayName = useMemo(() => {
    if (!doc) return '';
    return isEN
      ? (doc.title || doc.file_name)
      : (doc.title_ar || doc.title || doc.file_name_ar || doc.file_name);
  }, [doc, isEN]);

  const handleDownload = async () => {
    if (!doc?.id) return;
    try {
      await downloadDocumentById(doc.id, doc.file_name);
    } catch {
      toast.error(isEN ? 'Download failed' : 'فشل التحميل');
    }
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_REPLY_BYTES) {
      toast.error(isEN ? 'File exceeds 25 MB limit' : 'الملف يتجاوز حد 25 ميجابايت');
      return;
    }
    setReplyFile(f);
    e.target.value = '';
  };

  const handleSendReply = async () => {
    if (!doc || !replyFile || !user?.id || !profile?.id) return;
    if (!doc.case_id) {
      toast.error(isEN ? 'Reply uploads are only available on case documents' : 'الرفع متاح فقط على مستندات القضايا');
      return;
    }
    setUploading(true);
    const ts = Date.now();
    const fileExt = (replyFile.name.split('.').pop() || '').toLowerCase();
    const path = `${doc.organization_id}/portal-uploads/${doc.case_id}/${ts}-${safeName(replyFile.name)}`;

    try {
      const { error: upErr } = await supabase.storage.from('documents').upload(path, replyFile, {
        contentType: replyFile.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) throw upErr;

      // Insert as a new document, attached to the same case, visible to client (and firm)
      const { data: inserted, error: insErr } = await supabase
        .from('documents')
        .insert({
          organization_id: doc.organization_id,
          uploaded_by: user.id,
          file_name: replyFile.name,
          file_path: path,
          file_size_bytes: replyFile.size,
          file_type: fileExt,
          mime_type: replyFile.type || null,
          document_category: 'other',
          visibility_scope: 'case_specific',
          is_visible_to_client: true,
          status: 'active',
          version: 1,
          is_latest_version: true,
          indexing_status: 'pending',
          case_id: doc.case_id,
          person_id: doc.person_id,
          entity_id: doc.entity_id,
          party_type: doc.party_type,
          title: replyFile.name,
        } as any)
        .select('id, file_name')
        .single();
      if (insErr) {
        await supabase.storage.from('documents').remove([path]).catch(() => null);
        throw insErr;
      }

      // Auto-post a comment on the original doc that links the reply file
      const noteText = isEN
        ? `Uploaded a related file: ${replyFile.name}`
        : `تم رفع ملف ذو صلة: ${replyFile.name}`;
      await supabase.from('document_comments').insert({
        document_id: doc.id,
        organization_id: doc.organization_id,
        author_id: profile.id,
        author_type: 'client',
        content: noteText,
        is_visible_to_client: true,
      } as any);

      toast.success(isEN ? 'File sent to your firm' : 'تم إرسال الملف إلى مكتبك');
      setReplyFile(null);
      // Trigger AI indexing in the background
      supabase.functions.invoke('index-document', { body: { document_id: inserted!.id } }).catch(() => null);
      queryClient.invalidateQueries({ queryKey: ['portal-documents'] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || (isEN ? 'Upload failed' : 'فشل الرفع'));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <PageLoader />;

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-display-sm font-bold text-primary">
          {isEN ? 'Document not found' : 'المستند غير موجود'}
        </h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'It may have been removed or is no longer shared with you.' : 'قد يكون قد تمت إزالته أو لم يعد مشاركاً معك.'}
        </p>
        <Button asChild variant="outline">
          <Link to="/portal/documents"><ArrowLeft className="h-4 w-4 me-1.5" />{isEN ? 'Back to documents' : 'العودة إلى المستندات'}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/documents')} className="shrink-0 mt-0.5">
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-display-sm font-bold text-primary truncate">{displayName}</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            {fmtSize(doc.file_size_bytes)} · {doc.file_type?.toUpperCase()} · {format(new Date(doc.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <Button onClick={handleDownload} className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
          <Download className="h-4 w-4 me-1.5" />
          {isEN ? 'Download' : 'تحميل'}
        </Button>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview">{isEN ? 'Preview' : 'المعاينة'}</TabsTrigger>
          <TabsTrigger value="comments">{isEN ? 'Discussion' : 'المناقشة'}</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <Card className="overflow-hidden border-border">
            {isPdf && previewUrl ? (
              <iframe src={previewUrl} className="w-full h-[600px]" title={displayName} />
            ) : isImage && previewUrl ? (
              <div className="flex items-center justify-center p-4 max-h-[600px] bg-muted/30">
                <img src={previewUrl} alt={displayName} className="max-h-[560px] object-contain rounded" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] gap-3 bg-muted/30">
                <FIcon size={56} style={{ color: iconCfg.color }} />
                <p className="text-body-sm text-muted-foreground">
                  {isEN ? 'Preview not available for this file type' : 'المعاينة غير متاحة لهذا النوع'}
                </p>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 me-1.5" />
                  {isEN ? 'Download' : 'تحميل'}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {/* Comment thread (existing component, client variant) */}
          <Card className="p-4 border-border">
            <DocumentCommentsTab
              documentId={doc.id}
              organizationId={doc.organization_id}
              variant="client"
              documentVisibleToClient={true}
            />
          </Card>

          {/* Reply with a file — only when the doc is attached to a case */}
          {doc.case_id ? (
            <Card className="p-4 border-border space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-accent" />
                <h3 className="text-body-md font-medium text-foreground">
                  {isEN ? 'Send a related file to your firm' : 'إرسال ملف ذو صلة إلى مكتبك'}
                </h3>
              </div>
              <p className="text-body-xs text-muted-foreground">
                {isEN
                  ? 'Attach a file to this case. Your firm will be notified and the file will appear under the case.'
                  : 'أرفق ملفاً بهذه القضية. سيتم إعلام مكتبك وسيظهر الملف ضمن القضية.'}
              </p>

              {!replyFile ? (
                <label
                  htmlFor="portal-reply-file"
                  className="flex items-center justify-center gap-2 border border-dashed border-border rounded-md py-6 px-4 cursor-pointer hover:bg-muted/40 transition"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body-sm text-muted-foreground">
                    {isEN ? 'Click to choose a file (max 25 MB)' : 'اضغط لاختيار ملف (الحد الأقصى 25 ميجابايت)'}
                  </span>
                  <input
                    ref={fileInputRef}
                    id="portal-reply-file"
                    type="file"
                    className="hidden"
                    onChange={handlePickFile}
                    disabled={uploading}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-2 bg-muted/40 rounded px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-body-sm truncate">{replyFile.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{fmtSize(replyFile.size)}</span>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => setReplyFile(null)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSendReply}
                  disabled={!replyFile || uploading}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {uploading
                    ? <><Loader2 className="h-4 w-4 me-1.5 animate-spin" />{isEN ? 'Sending…' : 'جارٍ الإرسال...'}</>
                    : <><Upload className="h-4 w-4 me-1.5" />{isEN ? 'Send file' : 'إرسال الملف'}</>}
                </Button>
              </div>
            </Card>
          ) : (
            <p className="text-body-xs text-muted-foreground text-center">
              {isEN
                ? 'File replies are available on documents attached to a case.'
                : 'الرد بالملفات متاح على المستندات المرتبطة بقضية.'}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
