import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { toast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Copy, ArrowLeftRight, Loader2 } from 'lucide-react';

export default function AITranslatePage() {
  const { language } = useLanguage();
  const { profile } = useAuth();

  const [sourceLang, setSourceLang] = useState<'en' | 'ar'>('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [generating, setGenerating] = useState(false);
  const resultRef = useRef('');

  const targetLang = sourceLang === 'en' ? 'ar' : 'en';

  const handleSwap = () => {
    setSourceLang(targetLang as 'en' | 'ar');
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setGenerating(true);
    setTranslatedText('');
    resultRef.current = '';

    const fromLabel = sourceLang === 'en' ? 'English' : 'Arabic';
    const toLabel = targetLang === 'en' ? 'English' : 'Arabic';

    await streamAI({
      feature: 'translation',
      prompt: `Translate the following legal text from ${fromLabel} to ${toLabel}. Maintain legal terminology accuracy for Iraqi law context. Output ONLY the translation, no explanations.\n\nText:\n${sourceText}`,
      language: targetLang as any,
      onDelta: (chunk) => { resultRef.current += chunk; setTranslatedText(resultRef.current); },
      onDone: () => {
        setGenerating(false);
        if (profile?.organization_id) {
          supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id, user_id: profile.id,
            feature: 'translation', total_tokens: 0, model: 'google/gemini-3-flash-preview',
            input_preview: sourceText.slice(0, 200), output_preview: resultRef.current.slice(0, 200), status: 'success',
          } as any).then(() => {});
        }
      },
      onError: (err) => {
        setGenerating(false);
        toast({ title: 'Error', description: err, variant: 'destructive' });
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    toast({ title: language === 'ar' ? 'تم النسخ!' : 'Copied!' });
  };

  return (
    <div>
      <PageHeader
        title="AI Translation"
        titleAr="ترجمة بالذكاء الاصطناعي"
        subtitle="Translate legal texts between Arabic and English"
        subtitleAr="ترجمة النصوص القانونية بين العربية والإنجليزية"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Translate', labelAr: 'ترجمة' },
        ]}
      />

      <div className="max-w-5xl mx-auto">
        {/* Language selectors */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-body-lg font-semibold px-4 py-2 rounded-lg bg-card border border-border min-w-[120px] text-center">
            {sourceLang === 'en' ? '🇬🇧 English' : '🇮🇶 العربية'}
          </div>
          <Button variant="outline" size="icon" onClick={handleSwap} className="rounded-full">
            <ArrowLeftRight size={16} />
          </Button>
          <div className="text-body-lg font-semibold px-4 py-2 rounded-lg bg-card border border-border min-w-[120px] text-center">
            {targetLang === 'en' ? '🇬🇧 English' : '🇮🇶 العربية'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Source */}
          <div className="bg-card border border-border rounded-lg p-4">
            <textarea
              className="w-full min-h-[300px] bg-transparent border-none outline-none resize-y text-body-md"
              dir={sourceLang === 'ar' ? 'rtl' : 'ltr'}
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder={sourceLang === 'en'
                ? 'Enter text to translate...'
                : 'أدخل النص للترجمة...'}
            />
          </div>

          {/* Target */}
          <div className="bg-card border border-border rounded-lg p-4 relative">
            {!translatedText && !generating ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                <Sparkles size={32} className="mb-2 opacity-30" />
                <p className="text-body-md">{language === 'ar' ? 'ستظهر الترجمة هنا' : 'Translation will appear here'}</p>
              </div>
            ) : (
              <div
                className={cn('min-h-[300px] text-body-md whitespace-pre-wrap', generating && 'animate-pulse')}
                dir={targetLang === 'ar' ? 'rtl' : 'ltr'}
              >
                {translatedText}
                {generating && <span className="inline-block w-2 h-5 bg-accent animate-pulse ms-0.5" />}
              </div>
            )}

            {translatedText && !generating && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="absolute top-2 end-2">
                <Copy size={14} className="me-1" />{language === 'ar' ? 'نسخ' : 'Copy'}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleTranslate}
            disabled={!sourceText.trim() || generating}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11"
          >
            {generating ? (
              <><Loader2 size={16} className="me-2 animate-spin" />{language === 'ar' ? 'جاري الترجمة...' : 'Translating...'}</>
            ) : (
              <><Sparkles size={16} className="me-2" />{language === 'ar' ? 'ترجمة' : 'Translate'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
