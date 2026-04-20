import React, { useState, useRef, useEffect } from 'react';
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
import {
  Sparkles, Copy, Save, RefreshCw, Loader2, AlertTriangle,
  Search, CheckCircle2, BookOpen, Scale as ScaleIcon, FileText, Quote,
} from 'lucide-react';
import { format } from 'date-fns';

const LEGAL_AREAS = [
  'all', 'civil', 'criminal', 'commercial', 'labor', 'administrative',
  'family', 'constitutional', 'tax', 'real_estate', 'ip',
];

const JURISDICTIONS = ['iraqi_law', 'kurdistan_region', 'international'];

const LOADING_STEPS = [
  { en: 'Analyzing your question...', ar: 'تحليل سؤالك...' },
  { en: 'Searching relevant laws and articles...', ar: 'البحث في القوانين والمواد ذات الصلة...' },
  { en: 'Compiling research findings...', ar: 'تجميع نتائج البحث...' },
  { en: 'Generating recommendations...', ar: 'إنشاء التوصيات...' },
];

export default function AILegalResearchPage() {
  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();

  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState('iraqi_law');
  const [legalArea, setLegalArea] = useState('all');
  const [outputLang, setOutputLang] = useState<string>('ar');
  const [linkedCaseId, setLinkedCaseId] = useState('');
  const [caseOptions, setCaseOptions] = useState<{ value: string; label: string }[]>([]);

  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState('');
  const resultRef = useRef('');

  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('cases')
      .select('id, case_number, title, title_ar')
      .eq('organization_id', profile.organization_id!)
      .not('status', 'in', '("closed","archived")')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setCaseOptions(data.map((c: any) => ({
          value: c.id,
          label: `${c.case_number} — ${language === 'ar' && c.title_ar ? c.title_ar : c.title}`,
        })));
      });

    // Load recent history
    supabase
      .from('ai_usage_log')
      .select('id, input_preview, output_preview, created_at')
      .eq('user_id', profile.id)
      .eq('feature', 'legal_research')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentHistory(data || []));
  }, [profile?.organization_id, language, profile?.id]);

  const handleResearch = async () => {
    if (!query.trim()) return;
    setGenerating(true);
    setResult('');
    resultRef.current = '';
    setLoadingStep(0);

    // Simulate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= LOADING_STEPS.length - 1) { clearInterval(stepInterval); return prev; }
        return prev + 1;
      });
    }, 2500);

    let caseData: Record<string, any> | undefined;
    if (linkedCaseId) {
      const { data: c } = await supabase.from('cases').select('*').eq('id', linkedCaseId).maybeSingle();
      if (c) caseData = c;
    }

    const jurisdictionLabel = jurisdiction === 'iraqi_law' ? 'Iraqi Law' : jurisdiction === 'kurdistan_region' ? 'Kurdistan Region Law' : 'International Law';
    const areaLabel = legalArea === 'all' ? '' : `Legal Area: ${legalArea}\n`;

    const fullPrompt = `Research the following legal question under ${jurisdictionLabel}.\n${areaLabel}\nQuestion: ${query}\n\nProvide:\n1. **Research Summary** (2-3 paragraphs)\n2. **Applicable Laws** (list relevant Iraqi laws with article numbers)\n3. **Legal Analysis** (detailed analysis)\n4. **Sources to Verify** (suggested official sources)\n\nUse proper Iraqi legal terminology. Output in ${outputLang === 'ar' ? 'Arabic' : outputLang === 'bilingual' ? 'both Arabic and English' : 'English'}.`;

    await streamAI({
      feature: 'legal_research',
      prompt: fullPrompt,
      context: caseData ? `Case: ${caseData.title} (${caseData.case_number}), Type: ${caseData.case_type}, Court: ${caseData.court_name || 'N/A'}` : undefined,
      language: outputLang as any,
      caseData,
      onDelta: (chunk) => { resultRef.current += chunk; setResult(resultRef.current); },
      onDone: () => {
        clearInterval(stepInterval);
        setGenerating(false);
        if (profile?.organization_id) {
          supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id,
            user_id: profile.id,
            feature: 'legal_research',
            total_tokens: 0,
            model: 'google/gemini-3-flash-preview',
            input_preview: query.slice(0, 200),
            output_preview: resultRef.current.slice(0, 500),
            status: 'success',
          } as any).then(() => {
            // Refresh history
            supabase.from('ai_usage_log').select('id, input_preview, output_preview, created_at')
              .eq('user_id', profile.id).eq('feature', 'legal_research')
              .order('created_at', { ascending: false }).limit(5)
              .then(({ data }) => setRecentHistory(data || []));
          });
        }
      },
      onError: (err) => {
        clearInterval(stepInterval);
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
    const fileName = `AI-Research-${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([result], { type: 'text/plain' });
    const filePath = `${profile.organization_id}/ai-research/${Date.now()}-${fileName}`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, blob);
    if (uploadErr) { toast({ title: 'Error', description: uploadErr.message, variant: 'destructive' }); return; }
    const { error: docErr } = await supabase.from('documents').insert({
      organization_id: profile.organization_id, uploaded_by: profile.id,
      file_name: fileName, file_path: filePath, file_type: 'txt', mime_type: 'text/plain',
      file_size_bytes: blob.size, document_category: 'research',
      title: language === 'ar' ? 'بحث قانوني ذكي' : 'AI Legal Research',
      case_id: linkedCaseId || null,
    } as any);
    if (docErr) toast({ title: 'Error', description: docErr.message, variant: 'destructive' });
    else toast({ title: language === 'ar' ? 'تم الحفظ كمستند' : 'Saved as document' });
  };

  const handleNewResearch = () => { setQuery(''); setResult(''); setLinkedCaseId(''); };

  return (
    <div>
      <PageHeader
        title="AI Legal Research"
        titleAr="بحث قانوني بالذكاء الاصطناعي"
        subtitle="Research Iraqi law, legal precedents, and regulations"
        subtitleAr="البحث في القانون العراقي والسوابق القضائية والأنظمة"
        helpKey="ai.legal-research"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Legal Research', labelAr: 'بحث قانوني' },
        ]}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Disclaimer pill */}
        <div className="bg-accent/5 border border-accent/20 rounded-full px-4 py-2 flex items-center gap-2 w-fit">
          <AlertTriangle size={14} className="text-accent shrink-0" />
          <span className="text-body-sm text-foreground/80">{t('ai.research.disclaimer')}</span>
        </div>

        {/* Search Form */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <FormField label={language === 'ar' ? 'ماذا تريد أن تبحث؟' : 'What do you want to research?'} required>
            <FormTextarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('ai.research.queryPlaceholder')}
              className="min-h-[120px]"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label={t('ai.research.jurisdiction')}>
              <FormSelect
                value={jurisdiction}
                onValueChange={setJurisdiction}
                options={JURISDICTIONS.map(j => ({
                  value: j,
                  label: j === 'iraqi_law' ? (language === 'ar' ? 'القانون العراقي' : 'Iraqi Law')
                    : j === 'kurdistan_region' ? (language === 'ar' ? 'إقليم كردستان' : 'Kurdistan Region')
                    : (language === 'ar' ? 'دولي' : 'International'),
                }))}
              />
            </FormField>
            <FormField label={language === 'ar' ? 'المجال القانوني' : 'Legal Area'}>
              <FormSelect
                value={legalArea}
                onValueChange={setLegalArea}
                options={LEGAL_AREAS.map(a => ({
                  value: a,
                  label: a === 'all' ? (language === 'ar' ? 'جميع المجالات' : 'All Areas')
                    : a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                }))}
              />
            </FormField>
            <FormField label={language === 'ar' ? 'لغة المخرج' : 'Output Language'}>
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
          </div>

          <FormField label={language === 'ar' ? 'ربط بقضية (اختياري)' : 'Link to Case (optional)'}>
            <FormSearchSelect
              value={linkedCaseId}
              onChange={setLinkedCaseId}
              placeholder={language === 'ar' ? 'اختر قضية...' : 'Select a case...'}
              options={caseOptions}
            />
          </FormField>

          <Button
            onClick={handleResearch}
            disabled={!query.trim() || generating}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11"
          >
            {generating ? (
              <><Loader2 size={16} className="me-2 animate-spin" />{t('ai.research.searching')}</>
            ) : (
              <><Search size={16} className="me-2" /><Sparkles size={14} className="me-1" />{t('ai.research.search')}</>
            )}
          </Button>
        </div>

        {/* Loading state */}
        {generating && !result && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-accent animate-pulse" />
              <span className="text-heading-sm font-semibold">{language === 'ar' ? 'جاري البحث في القانون العراقي...' : 'Researching Iraqi law...'}</span>
            </div>
            <div className="space-y-3">
              {LOADING_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {i <= loadingStep ? (
                    <CheckCircle2 size={16} className="text-accent shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                  )}
                  <span className={cn('text-body-md', i <= loadingStep ? 'text-foreground' : 'text-muted-foreground')}>
                    {language === 'ar' ? step.ar : step.en}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-accent" />
                <h3 className="text-heading-sm font-semibold">{t('ai.research.results')}</h3>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-md p-3 flex items-start gap-2 mb-4">
                <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
                <p className="text-body-sm text-foreground/80">{t('ai.research.disclaimer')}</p>
              </div>

              <div
                className={cn('text-body-md text-foreground whitespace-pre-wrap leading-relaxed', generating && 'animate-pulse')}
                dir={outputLang === 'ar' ? 'rtl' : 'ltr'}
              >
                {result}
                {generating && <span className="inline-block w-2 h-5 bg-accent animate-pulse ms-0.5" />}
              </div>

              {!generating && (
                <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy size={14} className="me-1.5" />{t('ai.copyResult')}
                  </Button>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveAsDoc}>
                    <Save size={14} className="me-1.5" />{language === 'ar' ? 'حفظ كمستند' : 'Save as Document'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNewResearch}>
                    <RefreshCw size={14} className="me-1.5" />{language === 'ar' ? 'بحث جديد' : 'New Research'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent history */}
        {recentHistory.length > 0 && !result && !generating && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h4 className="text-heading-sm font-semibold mb-3">
              {language === 'ar' ? 'الأبحاث الأخيرة' : 'Recent Research'} ({recentHistory.length})
            </h4>
            <div className="space-y-2">
              {recentHistory.map(h => (
                <button
                  key={h.id}
                  onClick={() => { setQuery(h.input_preview || ''); if (h.output_preview) setResult(h.output_preview); }}
                  className="w-full text-start p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
                >
                  <p className="text-body-md text-foreground truncate">{h.input_preview}</p>
                  <p className="text-body-sm text-muted-foreground mt-1">
                    {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
