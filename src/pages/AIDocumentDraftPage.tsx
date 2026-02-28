import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { toast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { FormField } from '@/components/ui/FormField';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Copy, Save, RefreshCw, Loader2, Pencil, AlertTriangle } from 'lucide-react';

const DOCUMENT_TYPES = [
  'auto_detect', 'power_of_attorney', 'contract', 'memorandum',
  'letter', 'motion', 'pleading', 'other',
];

export default function AIDocumentDraftPage() {
  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [outputLang, setOutputLang] = useState<string>('ar');
  const [tone, setTone] = useState<string>('formal');
  const [docType, setDocType] = useState<string>('auto_detect');
  const [context, setContext] = useState('');
  const [linkedCaseId, setLinkedCaseId] = useState('');
  const [caseOptions, setCaseOptions] = useState<{ value: string; label: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const resultRef = useRef('');

  React.useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('cases')
      .select('id, case_number, title, title_ar')
      .eq('organization_id', profile.organization_id!)
      .not('status', 'in', '("closed","archived")')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setCaseOptions(data.map((c: any) => ({
            value: c.id,
            label: `${c.case_number} — ${language === 'ar' && c.title_ar ? c.title_ar : c.title}`,
          })));
        }
      });
  }, [profile?.organization_id, language]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setResult('');
    resultRef.current = '';
    setIsEditing(false);

    let caseData: Record<string, any> | undefined;
    let clientData: Record<string, any> | undefined;

    if (linkedCaseId) {
      const { data: c } = await supabase.from('cases').select('*, clients(first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, client_type, national_id_number)').eq('id', linkedCaseId).maybeSingle();
      if (c) {
        caseData = c;
        const cl = (c as any).clients;
        if (cl) {
          clientData = {
            name: cl.client_type === 'company'
              ? (language === 'ar' ? cl.company_name_ar || cl.company_name : cl.company_name)
              : (language === 'ar' ? `${cl.first_name_ar || ''} ${cl.last_name_ar || ''}` : `${cl.first_name || ''} ${cl.last_name || ''}`).trim(),
            national_id: cl.national_id_number,
          };
        }
      }
    }

    const fullPrompt = `${docType !== 'auto_detect' ? `Document Type: ${docType.replace(/_/g, ' ')}\n` : ''}Tone: ${tone}\n\n${prompt}`;

    await streamAI({
      feature: 'document_draft',
      prompt: fullPrompt,
      context,
      language: outputLang as any,
      caseData,
      clientData,
      onDelta: (chunk) => {
        resultRef.current += chunk;
        setResult(resultRef.current);
      },
      onDone: () => {
        setGenerating(false);
        if (profile?.organization_id) {
          supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id,
            user_id: profile.id,
            feature: 'document_draft',
            total_tokens: 0,
            model: 'google/gemini-3-flash-preview',
            input_preview: prompt.slice(0, 200),
            output_preview: resultRef.current.slice(0, 200),
            status: 'success',
          } as any).then(() => {});
        }
      },
      onError: (err) => {
        setGenerating(false);
        toast({ title: t('ai.title'), description: err, variant: 'destructive' });
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast({ title: language === 'ar' ? 'تم النسخ!' : 'Copied!' });
  };

  const handleSaveAsDoc = async () => {
    if (!result || !profile?.organization_id) return;
    const fileName = `AI-Draft-${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([result], { type: 'text/plain' });
    const filePath = `${profile.organization_id}/ai-drafts/${Date.now()}-${fileName}`;

    const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, blob);
    if (uploadErr) {
      toast({ title: 'Error', description: uploadErr.message, variant: 'destructive' });
      return;
    }

    const { error: docErr } = await supabase.from('documents').insert({
      organization_id: profile.organization_id,
      uploaded_by: profile.id,
      file_name: fileName,
      file_path: filePath,
      file_type: 'txt',
      mime_type: 'text/plain',
      file_size_bytes: blob.size,
      document_category: 'legal_document',
      title: language === 'ar' ? 'مسودة ذكاء اصطناعي' : 'AI Draft',
      case_id: linkedCaseId || null,
    } as any);

    if (docErr) {
      toast({ title: 'Error', description: docErr.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'ar' ? 'تم الحفظ كمستند' : 'Saved as document' });
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Document Drafting"
        titleAr="صياغة مستند بالذكاء الاصطناعي"
        subtitle="Describe what you need and AI will draft it for you"
        subtitleAr="صف ما تحتاجه وسيقوم الذكاء الاصطناعي بصياغته لك"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'AI Draft', labelAr: 'صياغة ذكية' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel — Input */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <FormField label={t('ai.draft.promptLabel')} required>
              <FormTextarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={t('ai.draft.promptPlaceholder')}
                className="min-h-[150px]"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={t('ai.draft.language')}>
                <FormSelect
                  value={outputLang}
                  onValueChange={setOutputLang}
                  options={[
                    { value: 'ar', label: language === 'ar' ? 'العربية' : 'Arabic' },
                    { value: 'en', label: language === 'ar' ? 'الإنجليزية' : 'English' },
                    { value: 'bilingual', label: language === 'ar' ? 'ثنائي اللغة' : 'Bilingual' },
                  ]}
                />
              </FormField>
              <FormField label={t('ai.draft.tone')}>
                <FormSelect
                  value={tone}
                  onValueChange={setTone}
                  options={[
                    { value: 'formal', label: t('ai.draft.toneOptions.formal') },
                    { value: 'standard', label: t('ai.draft.toneOptions.standard') },
                    { value: 'simplified', label: t('ai.draft.toneOptions.simplified') },
                  ]}
                />
              </FormField>
            </div>

            <FormField label={language === 'ar' ? 'نوع المستند' : 'Document Type'}>
              <FormSelect
                value={docType}
                onValueChange={setDocType}
                options={DOCUMENT_TYPES.map(dt => ({
                  value: dt,
                  label: dt === 'auto_detect'
                    ? (language === 'ar' ? 'كشف تلقائي' : 'Auto-detect')
                    : dt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                }))}
              />
            </FormField>

            <FormField label={language === 'ar' ? 'ربط بقضية (اختياري)' : 'Link to Case (optional)'}>
              <FormSearchSelect
                value={linkedCaseId}
                onChange={setLinkedCaseId}
                placeholder={language === 'ar' ? 'اختر قضية...' : 'Select a case...'}
                options={caseOptions}
              />
            </FormField>

            <FormField label={t('ai.draft.context')}>
              <FormTextarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder={t('ai.draft.contextPlaceholder')}
                className="min-h-[80px]"
              />
            </FormField>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11"
            >
              {generating ? (
                <><Loader2 size={16} className="me-2 animate-spin" />{t('ai.generating')}</>
              ) : (
                <><Sparkles size={16} className="me-2" />{t('ai.draft.generate')}</>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel — Result */}
        <div>
          <div className="bg-card border border-border rounded-lg p-5 min-h-[400px] flex flex-col">
            {!result && !generating ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <Sparkles size={48} className="text-muted-foreground/30 mb-4" />
                <p className="text-body-md text-muted-foreground">
                  {language === 'ar' ? 'ستظهر المسودة المُنشأة هنا' : 'Your AI-generated draft will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent" />
                  <h3 className="text-heading-sm font-semibold text-foreground">{t('ai.draft.result')}</h3>
                </div>

                {/* Disclaimer */}
                <div className="bg-accent/5 border border-accent/20 rounded-md p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
                  <p className="text-body-sm text-foreground/80">{t('ai.disclaimer')}</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                  {isEditing ? (
                    <textarea
                      className="w-full h-full min-h-[300px] border border-border rounded-md p-3 text-body-md font-mono resize-y bg-background"
                      value={result}
                      onChange={e => setResult(e.target.value)}
                      dir={outputLang === 'ar' ? 'rtl' : 'ltr'}
                    />
                  ) : (
                    <div
                      className={cn(
                        'text-body-md text-foreground whitespace-pre-wrap leading-relaxed',
                        generating && 'animate-pulse',
                      )}
                      dir={outputLang === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {result}
                      {generating && <span className="inline-block w-2 h-5 bg-accent animate-pulse ms-0.5" />}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {result && !generating && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy size={14} className="me-1.5" />{t('ai.copyResult')}
                    </Button>
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveAsDoc}>
                      <Save size={14} className="me-1.5" />{t('ai.draft.saveAsDocument')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                      <RefreshCw size={14} className="me-1.5" />{t('ai.regenerate')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                      <Pencil size={14} className="me-1.5" />{t('ai.draft.editAndRefine')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
