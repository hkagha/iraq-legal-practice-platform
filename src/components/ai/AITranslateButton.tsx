import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { Sparkles, Loader2 } from 'lucide-react';

interface AITranslateButtonProps {
  sourceText: string;
  sourceLanguage: 'en' | 'ar';
  onTranslated: (text: string) => void;
}

export default function AITranslateButton({ sourceText, sourceLanguage, onTranslated }: AITranslateButtonProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  if (!sourceText?.trim()) return null;

  const handleTranslate = async () => {
    setLoading(true);
    let result = '';
    const fromLabel = sourceLanguage === 'en' ? 'English' : 'Arabic';
    const toLabel = sourceLanguage === 'en' ? 'Arabic' : 'English';

    await streamAI({
      feature: 'translation',
      prompt: `Translate the following legal text from ${fromLabel} to ${toLabel}. Maintain legal terminology accuracy for Iraqi law context. Output ONLY the translation.\n\n${sourceText}`,
      language: sourceLanguage === 'en' ? 'ar' : 'en',
      onDelta: (chunk) => { result += chunk; },
      onDone: () => {
        setLoading(false);
        onTranslated(result);
        setShowBadge(true);
        setTimeout(() => setShowBadge(false), 3000);
        if (profile?.organization_id) {
          supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id, user_id: profile.id,
            feature: 'translation', total_tokens: 0, model: 'google/gemini-3-flash-preview',
            input_preview: sourceText.slice(0, 200), output_preview: result.slice(0, 200), status: 'success',
          } as any).then(() => {});
        }
      },
      onError: () => { setLoading(false); },
    });
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleTranslate}
        disabled={loading}
        className="text-[11px] text-accent flex items-center gap-0.5 hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {language === 'ar' ? 'ترجم' : 'Translate'}
      </button>
      {showBadge && (
        <span className="text-[10px] text-accent/70 animate-in fade-in">
          ✨ {language === 'ar' ? 'ترجمة ذكية' : 'AI translated'}
        </span>
      )}
    </span>
  );
}
