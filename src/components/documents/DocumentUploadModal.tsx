import { useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { triggerDocumentIndexing } from '@/lib/documentIndexing';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  /** Optional pre-link to a case */
  caseId?: string;
  /** Optional pre-link to an errand */
  errandId?: string;
  /** Optional pre-link to a client (person) */
  clientId?: string;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

function inferCategoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (/contract|agreement|عقد|اتفاق/.test(n)) return 'contract';
  if (/invoice|فاتورة/.test(n)) return 'invoice';
  if (/judgment|ruling|حكم|قرار/.test(n)) return 'court_filing';
  if (/id|passport|هوية|جواز/.test(n)) return 'identification';
  if (/draft|مسودة/.test(n)) return 'draft';
  return 'other';
}

export default function DocumentUploadModal({ open, onClose, onComplete, caseId, errandId, clientId }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isAR = language === 'ar';

  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reset = useCallback(() => {
    setFiles([]); setTitle(''); setDescription(''); setVisibleToClient(false);
    setUploading(false); setProgress(null);
  }, []);

  const handleClose = () => { if (!uploading) { reset(); onClose(); } };

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const valid = list.filter(f => {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(isAR ? `${f.name}: حجم الملف يتجاوز 50 ميجابايت` : `${f.name}: exceeds 50 MB limit`);
        return false;
      }
      return true;
    });
    setFiles(valid);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!profile?.organization_id || !profile?.id) {
      toast.error(isAR ? 'لم يتم تحديد المؤسسة' : 'Organization not found');
      return;
    }
    if (files.length === 0) {
      toast.error(isAR ? 'الرجاء اختيار ملف واحد على الأقل' : 'Please pick at least one file');
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: files.length });
    const orgId = profile.organization_id;
    const userId = profile.id;
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const ts = Date.now();
      const path = `${orgId}/uploads/${ts}-${i}-${safeName(file.name)}`;

      try {
        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
            upsert: false,
          });
        if (upErr) throw upErr;

        const insertPayload: any = {
          organization_id: orgId,
          uploaded_by: userId,
          file_name: file.name,
          file_path: path,
          file_size_bytes: file.size,
          file_type: ext,
          mime_type: file.type || null,
          title: files.length === 1 && title.trim() ? title.trim() : null,
          description: files.length === 1 && description.trim() ? description.trim() : null,
          document_category: inferCategoryFromName(file.name),
          visibility_scope: caseId ? 'case_specific' : 'internal',
          is_visible_to_client: visibleToClient,
          status: 'active',
          version: 1,
          is_latest_version: true,
          indexing_status: 'pending',
          case_id: caseId || null,
          errand_id: errandId || null,
          person_id: clientId || null,
        };

        const { data: inserted, error: insErr } = await supabase
          .from('documents')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insErr) {
          // Rollback the storage object on DB failure
          await supabase.storage.from('documents').remove([path]).catch(() => null);
          throw insErr;
        }

        // Fire-and-forget indexing
        if (inserted?.id) triggerDocumentIndexing(inserted.id);

        successCount++;
      } catch (e: any) {
        console.error('Upload failed for', file.name, e);
        errors.push(`${file.name}: ${e?.message || 'unknown error'}`);
      } finally {
        setProgress({ done: i + 1, total: files.length });
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        isAR
          ? `تم رفع ${successCount} مستند${successCount > 1 ? 'ات' : ''}`
          : `Uploaded ${successCount} document${successCount > 1 ? 's' : ''}`
      );
      onComplete?.();
    }
    if (errors.length > 0) {
      toast.error(errors[0]);
    }
    if (errors.length === 0) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAR ? 'رفع مستند' : 'Upload Document'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone / file picker */}
          <label
            htmlFor="doc-file-input"
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-md py-8 px-4 cursor-pointer hover:bg-muted/40 transition"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-body-sm text-muted-foreground text-center">
              {isAR
                ? 'اضغط لاختيار الملفات (الحد الأقصى 50 ميجابايت لكل ملف)'
                : 'Click to choose files (max 50 MB each)'}
            </span>
            <input
              id="doc-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handlePickFiles}
              disabled={uploading}
            />
          </label>

          {files.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-muted/40 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-body-sm truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {f.size < 1048576 ? `${(f.size / 1024).toFixed(0)} KB` : `${(f.size / 1048576).toFixed(1)} MB`}
                    </span>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length === 1 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="doc-title">{isAR ? 'العنوان (اختياري)' : 'Title (optional)'}</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={uploading}
                  placeholder={isAR ? 'عنوان المستند' : 'Document title'}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-desc">{isAR ? 'الوصف (اختياري)' : 'Description (optional)'}</Label>
                <Textarea
                  id="doc-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploading}
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <div className="text-body-sm font-medium">
                {isAR ? 'مرئي للعميل' : 'Visible to client'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isAR ? 'يسمح للعميل برؤية هذا المستند في البوابة' : 'Allow the client to see this in their portal'}
              </div>
            </div>
            <Switch checked={visibleToClient} onCheckedChange={setVisibleToClient} disabled={uploading} />
          </div>

          {progress && (
            <div className="text-body-sm text-muted-foreground tabular-nums">
              {isAR ? 'جارٍ الرفع' : 'Uploading'}: {progress.done} / {progress.total}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {isAR ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
            {uploading ? (isAR ? 'جارٍ الرفع...' : 'Uploading…') : (isAR ? 'رفع' : 'Upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
