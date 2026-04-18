import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Upload, X, Trash2, FileText, File, Image, Sheet, FileType, Loader2, Check, AlertCircle, Sparkles,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain',
];

const FILE_TYPE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileType, color: '#EF4444' },
  doc: { icon: File, color: '#3B82F6' },
  docx: { icon: File, color: '#3B82F6' },
  xls: { icon: Sheet, color: '#22C55E' },
  xlsx: { icon: Sheet, color: '#22C55E' },
  jpg: { icon: Image, color: '#8B5CF6' },
  jpeg: { icon: Image, color: '#8B5CF6' },
  png: { icon: Image, color: '#8B5CF6' },
  gif: { icon: Image, color: '#8B5CF6' },
  webp: { icon: Image, color: '#8B5CF6' },
};

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

function suggestCategory(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('contract') || lower.includes('عقد')) return 'contract';
  if (lower.includes('poa') || lower.includes('توكيل') || lower.includes('power')) return 'power_of_attorney';
  if (lower.includes('invoice') || lower.includes('فاتورة')) return 'invoice_document';
  if (lower.includes('receipt') || lower.includes('إيصال')) return 'receipt';
  if (lower.includes('memo')) return 'memorandum';
  if (lower.includes('letter') || lower.includes('رسالة')) return 'letter';
  return 'general';
}

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() || '';
}

interface FileEntry {
  file: File;
  id: string;
  category: string;
  title: string;
  tags: string[];
  scope: 'internal' | 'shared_library' | 'case_specific';
  linkType: 'none' | 'case' | 'errand' | 'client';
  linkedId: string;
  visibleToClient: boolean;
  isVersion: boolean;
  parentDocId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  aiCategorizing?: boolean;
  aiSuggested?: boolean;
}

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  preLinkedCase?: { id: string; case_number: string; title: string };
  preLinkedErrand?: { id: string; errand_number: string; title: string };
  preLinkedClient?: { id: string; name: string };
}

export default function DocumentUploadModal({
  open, onClose, onComplete,
  preLinkedCase, preLinkedErrand, preLinkedClient,
}: DocumentUploadModalProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Entity search options
  const [caseOptions, setCaseOptions] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [errandOptions, setErrandOptions] = useState<{ value: string; label: string; subtitle?: string }[]>([]);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string; subtitle?: string }[]>([]);

  useEffect(() => {
    if (!open || !profile?.organization_id) return;
    const orgId = profile.organization_id;
    Promise.all([
      supabase.from('cases').select('id,case_number,title,title_ar').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.from('errands').select('id,errand_number,title,title_ar').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.from('clients').select('id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,client_type').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
    ]).then(([casesRes, errandsRes, clientsRes]) => {
      setCaseOptions((casesRes.data || []).map((c: any) => ({ value: c.id, label: `${c.case_number} — ${language === 'ar' && c.title_ar ? c.title_ar : c.title}` })));
      setErrandOptions((errandsRes.data || []).map((e: any) => ({ value: e.id, label: `${e.errand_number} — ${language === 'ar' && e.title_ar ? e.title_ar : e.title}` })));
      setClientOptions((clientsRes.data || []).map((c: any) => {
        const name = c.client_type === 'company' ? (language === 'ar' && c.company_name_ar ? c.company_name_ar : c.company_name || '') : (language === 'ar' && c.first_name_ar ? `${c.first_name_ar} ${c.last_name_ar || ''}` : `${c.first_name || ''} ${c.last_name || ''}`).trim();
        return { value: c.id, label: name };
      }));
    });
  }, [open, profile?.organization_id, language]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = [];
    Array.from(newFiles).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: ${language === 'ar' ? 'الملف كبير جداً (الحد الأقصى ١٠ MB)' : 'File too large (max 10MB)'}`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|webp|txt)$/i)) {
        toast.error(`${file.name}: ${language === 'ar' ? 'نوع الملف غير مدعوم' : 'File type not supported'}`);
        return;
      }
      const hasContext = !!(preLinkedCase || preLinkedErrand || preLinkedClient);
      const defaultLinkType = preLinkedCase ? 'case' : preLinkedErrand ? 'errand' : preLinkedClient ? 'client' : 'none';
      const defaultLinkedId = preLinkedCase?.id || preLinkedErrand?.id || preLinkedClient?.id || '';
      // If opened from a case/errand/client page, default to case_specific.
      // Otherwise default to internal — safest choice; user must opt in to sharing.
      const defaultScope: FileEntry['scope'] = hasContext ? 'case_specific' : 'internal';
      entries.push({
        file, id: crypto.randomUUID(),
        category: suggestCategory(file.name), title: '', tags: [],
        scope: defaultScope,
        linkType: defaultLinkType as any, linkedId: defaultLinkedId,
        visibleToClient: false, isVersion: false, parentDocId: '',
        progress: 0, status: 'pending',
      });
    });
    setFiles(prev => [...prev, ...entries]);
  }, [preLinkedCase, preLinkedErrand, preLinkedClient, language]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const updateFile = (id: string, updates: Partial<FileEntry>) => setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

  const canUpload = files.length > 0 && files.every(f => {
    if (!f.category) return false;
    if (f.scope === 'case_specific') {
      // Need a link target — either prelinked context or selected linkedId
      if (!preLinkedCase && !preLinkedErrand && !preLinkedClient && !f.linkedId) return false;
    }
    return true;
  }) && !isUploading;

  const handleUpload = async () => {
    if (!profile?.organization_id || !profile.id) return;
    setIsUploading(true);
    const orgId = profile.organization_id;
    let successCount = 0;

    for (const entry of files) {
      if (entry.status === 'done') continue;
      updateFile(entry.id, { status: 'uploading', progress: 10 });

      try {
        // Determine storage path
        const context = entry.linkType === 'case' ? 'cases' : entry.linkType === 'errand' ? 'errands' : entry.linkType === 'client' ? 'clients' : 'general';
        const entityId = entry.linkedId || 'general';
        const timestamp = Date.now();
        const storagePath = `${orgId}/${context}/${entityId}/${timestamp}-${entry.file.name}`;

        updateFile(entry.id, { progress: 30 });

        // Upload to storage
        const { error: uploadErr } = await supabase.storage.from('documents').upload(storagePath, entry.file, { contentType: entry.file.type });
        if (uploadErr) throw uploadErr;

        updateFile(entry.id, { progress: 60 });

        // Handle versioning
        let version = 1;
        let parentDocId: string | null = null;
        if (entry.isVersion && entry.parentDocId) {
          parentDocId = entry.parentDocId;
          const { data: parentDoc } = await supabase.from('documents').select('version').eq('id', parentDocId).single();
          if (parentDoc) {
            version = (parentDoc.version || 1) + 1;
            await supabase.from('documents').update({ is_latest_version: false } as any).eq('id', parentDocId);
          }
        }

        // Insert document record
        const ext = getExt(entry.file.name);
        const isCaseSpec = entry.scope === 'case_specific';
        const insertPayload: any = {
          organization_id: orgId,
          file_name: entry.file.name,
          file_path: storagePath,
          file_size_bytes: entry.file.size,
          file_type: ext,
          mime_type: entry.file.type,
          document_category: entry.category,
          title: entry.title || null,
          tags: entry.tags.length > 0 ? entry.tags : [],
          client_id: isCaseSpec && entry.linkType === 'client' ? entry.linkedId : (isCaseSpec ? (preLinkedClient?.id || null) : null),
          case_id: isCaseSpec && entry.linkType === 'case' ? entry.linkedId : (isCaseSpec ? (preLinkedCase?.id || null) : null),
          errand_id: isCaseSpec && entry.linkType === 'errand' ? entry.linkedId : (isCaseSpec ? (preLinkedErrand?.id || null) : null),
          is_visible_to_client: isCaseSpec ? entry.visibleToClient : false,
          visibility_scope: entry.scope,
          uploaded_by: profile.id,
          version,
          parent_document_id: parentDocId,
          is_latest_version: true,
        };
        const { data: insertedDoc, error: insertErr } = await supabase
          .from('documents').insert(insertPayload).select().maybeSingle();

        if (insertErr) throw insertErr;

        // Fallback: if RLS prevents reading the new row back, fetch by file_path
        let newDoc = insertedDoc;
        if (!newDoc) {
          const { data: fetched } = await supabase
            .from('documents')
            .select('*')
            .eq('organization_id', orgId)
            .eq('file_path', storagePath)
            .maybeSingle();
          newDoc = fetched;
        }

        updateFile(entry.id, { progress: 85 });

        // Log activity
        if (newDoc) {
          await supabase.from('document_activities').insert({
            document_id: newDoc.id,
            organization_id: orgId,
            actor_id: profile.id,
            activity_type: entry.isVersion ? 'version_created' : 'uploaded',
            title: entry.isVersion ? `New version uploaded: ${entry.file.name}` : `Document uploaded: ${entry.file.name}`,
            title_ar: entry.isVersion ? `تم رفع إصدار جديد: ${entry.file.name}` : `تم رفع مستند: ${entry.file.name}`,
          } as any);
        }

        updateFile(entry.id, { progress: 100, status: 'done' });
        successCount++;
      } catch (err: any) {
        console.error('Upload error:', err);
        updateFile(entry.id, { status: 'error', error: err.message });
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast.success(language === 'ar' ? `تم رفع ${successCount} مستند بنجاح` : `${successCount} document(s) uploaded successfully`);
      setTimeout(() => { onComplete(); onClose(); setFiles([]); }, 500);
    }
  };

  const categoryOptions = CATEGORY_OPTIONS.map(c => ({ value: c, label: t(`documents.categories.${c}`) }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isUploading) { onClose(); setFiles([]); } }}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-border flex-shrink-0">
          <DialogTitle>{t('documents.upload')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Dropzone */}
          {files.length === 0 && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg h-[160px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                isDragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/50',
              )}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={40} className="text-muted-foreground/50" />
              <p className="text-body-md text-muted-foreground">{language === 'ar' ? 'اسحب وأفلت الملفات هنا' : 'Drag and drop files here'}</p>
              <p className="text-body-sm text-accent underline">{language === 'ar' ? 'أو انقر للاختيار' : 'or click to browse'}</p>
              <p className="text-body-sm text-muted-foreground/60">Max 10MB • PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
            </div>
          )}

          <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />

          {files.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mb-2">
              <Upload size={14} className="me-1.5" /> {language === 'ar' ? 'إضافة ملفات أخرى' : 'Add more files'}
            </Button>
          )}

          {/* File entries */}
          {files.map(entry => {
            const ext = getExt(entry.file.name);
            const iconConfig = FILE_TYPE_ICONS[ext] || { icon: FileText, color: '#64748B' };
            const FIcon = iconConfig.icon;

            return (
              <div key={entry.id} className="border border-border rounded-lg p-4 space-y-3">
                {/* File header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FIcon size={20} style={{ color: iconConfig.color }} className="shrink-0" />
                    <span className="text-body-md font-medium truncate">{entry.file.name}</span>
                    <span className="text-body-sm text-muted-foreground shrink-0">({(entry.file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  {entry.status === 'pending' && (
                    <button onClick={() => removeFile(entry.id)} className="p-1 hover:bg-muted rounded transition-colors"><Trash2 size={16} className="text-muted-foreground" /></button>
                  )}
                  {entry.status === 'done' && <Check size={18} className="text-success" />}
                  {entry.status === 'error' && <AlertCircle size={18} className="text-destructive" />}
                </div>

                {/* Progress bar */}
                {(entry.status === 'uploading' || entry.status === 'done') && (
                  <div className="space-y-1">
                    <Progress value={entry.progress} className="h-1" />
                    <p className="text-body-sm text-muted-foreground">
                      {entry.status === 'uploading' ? `${entry.progress}%` : (language === 'ar' ? '✓ اكتمل' : '✓ Complete')}
                    </p>
                  </div>
                )}
                {entry.status === 'error' && <p className="text-body-sm text-destructive">{entry.error}</p>}

                {/* Form fields (only when pending) */}
                {entry.status === 'pending' && (
                  <>
                    {/* STEP 1 — Where does this document belong? (primary choice, drives the rest) */}
                    <div>
                      <label className="text-body-sm font-medium text-foreground mb-1.5 block">
                        {language === 'ar' ? 'أين ينتمي هذا المستند؟' : 'Where does this document belong?'} *
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          {
                            v: 'internal',
                            en: 'Internal use', ar: 'استخدام داخلي',
                            d_en: 'Firm policies, instructions, internal references — visible to your team only.',
                            d_ar: 'سياسات وتعليمات ومراجع داخلية للمكتب — مرئية لفريقك فقط.',
                          },
                          {
                            v: 'shared_library',
                            en: 'Shared library', ar: 'مكتبة مشتركة',
                            d_en: 'Reusable templates and explainers that can be sent to clients (e.g. how to register a company).',
                            d_ar: 'قوالب وشروحات قابلة لإعادة الاستخدام يمكن إرسالها للعملاء (مثل كيفية تسجيل شركة).',
                          },
                          {
                            v: 'case_specific',
                            en: 'Case-specific', ar: 'خاص بقضية',
                            d_en: 'Belongs to a specific case, errand, or client — visible to assigned team and optionally the client.',
                            d_ar: 'يخص قضية أو معاملة أو عميلاً معيناً — مرئي للفريق المعيّن واختيارياً للعميل.',
                          },
                        ] as const).map(opt => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => updateFile(entry.id, {
                              scope: opt.v as any,
                              linkType: opt.v === 'case_specific' ? (entry.linkType === 'none' ? 'case' : entry.linkType) : 'none',
                              linkedId: opt.v === 'case_specific' ? entry.linkedId : '',
                              visibleToClient: opt.v === 'case_specific' ? entry.visibleToClient : false,
                            })}
                            className={cn(
                              'p-3 rounded-button text-start border transition-colors',
                              entry.scope === opt.v ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted',
                            )}
                          >
                            <div className={cn('text-body-sm font-medium', entry.scope === opt.v ? 'text-accent' : 'text-foreground')}>
                              {language === 'ar' ? opt.ar : opt.en}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                              {language === 'ar' ? opt.d_ar : opt.d_en}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* STEP 2 — Category + title */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                          <label className="text-body-sm font-medium text-foreground">{t('documents.fields.category')} *</label>
                          {entry.aiSuggested && (
                            <span className="text-[10px] text-accent flex items-center gap-0.5">✨ AI</span>
                          )}
                          {!entry.aiCategorizing && !entry.aiSuggested && (
                            <button type="button" className="text-[11px] text-accent flex items-center gap-0.5 hover:underline" onClick={async (e) => {
                              e.preventDefault();
                              updateFile(entry.id, { aiCategorizing: true });
                              try {
                                const text = await entry.file.text().catch(() => '');
                                const preview = text.slice(0, 2000) || entry.file.name;
                                let aiResult = '';
                                await streamAI({
                                  feature: 'auto_categorize',
                                  prompt: `Analyze this document and categorize it. Choose exactly one category from this list: contract, pleading, motion, brief, memorandum, court_order, court_judgment, evidence, exhibit, correspondence, letter, notice, power_of_attorney, affidavit, declaration, corporate_document, registration_certificate, license, financial_document, invoice_document, receipt, identity_document, passport, national_id_copy, property_document, deed, template, draft, final, internal_memo, meeting_notes, research, government_form, government_response, government_receipt, photo, scan, other, general.\n\nAlso suggest a descriptive title.\n\nRespond in JSON only: {"category": "...", "title": "...", "title_ar": "..."}\n\nDocument filename: ${entry.file.name}\nDocument content:\n${preview}`,
                                  language: 'en',
                                  onDelta: (chunk) => { aiResult += chunk; },
                                  onDone: () => {
                                    try {
                                      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
                                      if (jsonMatch) {
                                        const parsed = JSON.parse(jsonMatch[0]);
                                        updateFile(entry.id, {
                                          category: parsed.category || 'general',
                                          title: parsed.title || entry.title,
                                          aiCategorizing: false,
                                          aiSuggested: true,
                                        });
                                      } else {
                                        updateFile(entry.id, { aiCategorizing: false });
                                      }
                                    } catch {
                                      updateFile(entry.id, { aiCategorizing: false });
                                      toast.error(language === 'ar' ? 'تعذر التصنيف التلقائي' : 'Could not auto-categorize');
                                    }
                                  },
                                  onError: () => {
                                    updateFile(entry.id, { aiCategorizing: false });
                                    toast.error(language === 'ar' ? 'تعذر التصنيف التلقائي' : 'Could not auto-categorize');
                                  },
                                });
                              } catch {
                                updateFile(entry.id, { aiCategorizing: false });
                              }
                            }}>
                              <Sparkles size={11} /> {language === 'ar' ? 'تصنيف تلقائي' : 'Auto-categorize'}
                            </button>
                          )}
                          {entry.aiCategorizing && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Loader2 size={11} className="animate-spin" /> {language === 'ar' ? 'تحليل...' : 'Analyzing...'}
                            </span>
                          )}
                        </div>
                        <FormSelect value={entry.category} onValueChange={v => updateFile(entry.id, { category: v })} options={categoryOptions} />
                      </div>
                      <div>
                        <label className="text-body-sm font-medium text-foreground mb-1 block">{t('documents.fields.title')}</label>
                        <FormInput value={entry.title} onChange={e => updateFile(entry.id, { title: e.target.value })} placeholder={language === 'ar' ? 'عنوان وصفي (اختياري)' : 'Descriptive title (optional)'} />
                      </div>
                    </div>

                    {/* Link to entity (only for case_specific) */}
                    {entry.scope === 'case_specific' && !preLinkedCase && !preLinkedErrand && !preLinkedClient && (
                      <div>
                        <label className="text-body-sm font-medium text-foreground mb-1.5 block">{language === 'ar' ? 'ربط بـ' : 'Link to'}</label>
                        <div className="flex gap-2 mb-2">
                          {(['case', 'errand', 'client'] as const).map(lt => (
                            <button key={lt} type="button" onClick={() => updateFile(entry.id, { linkType: lt, linkedId: '' })}
                              className={cn('px-3 py-1.5 rounded-button text-body-sm border transition-colors',
                                entry.linkType === lt ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-muted')}>
                              {lt === 'case' ? (language === 'ar' ? 'قضية' : 'Case') : lt === 'errand' ? (language === 'ar' ? 'معاملة' : 'Errand') : (language === 'ar' ? 'عميل' : 'Client')}
                            </button>
                          ))}
                        </div>
                        {entry.linkType === 'case' && <FormSearchSelect value={entry.linkedId} onChange={v => updateFile(entry.id, { linkedId: v })} options={caseOptions} placeholder={language === 'ar' ? 'اختر قضية...' : 'Select case...'} />}
                        {entry.linkType === 'errand' && <FormSearchSelect value={entry.linkedId} onChange={v => updateFile(entry.id, { linkedId: v })} options={errandOptions} placeholder={language === 'ar' ? 'اختر معاملة...' : 'Select errand...'} />}
                        {entry.linkType === 'client' && <FormSearchSelect value={entry.linkedId} onChange={v => updateFile(entry.id, { linkedId: v })} options={clientOptions} placeholder={language === 'ar' ? 'اختر عميلاً...' : 'Select client...'} />}
                      </div>
                    )}

                    {entry.scope === 'case_specific' && (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-body-sm cursor-pointer">
                          <Checkbox checked={entry.visibleToClient} onCheckedChange={v => updateFile(entry.id, { visibleToClient: !!v })} />
                          {t('documents.fields.visibleToClient')}
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => { onClose(); setFiles([]); }} disabled={isUploading}>{t('common.cancel')}</Button>
          <Button onClick={handleUpload} disabled={!canUpload} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {isUploading ? <><Loader2 size={14} className="animate-spin me-1.5" />{language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</> :
              `${language === 'ar' ? 'رفع' : 'Upload'} ${files.filter(f => f.status === 'pending').length} ${language === 'ar' ? 'ملفات' : 'file(s)'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
