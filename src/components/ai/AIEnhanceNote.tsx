import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Check, X } from 'lucide-react';

interface AIEnhanceNoteProps {
  content: string;
  entityType?: string; // 'case' | 'errand' | 'task'
  onAccept: (enhanced: string) => void;
}

export default function AIEnhanceNote({ content, entityType = 'case', onAccept }: AIEnhanceNoteProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enhanced, setEnhanced] = useState('');
  const resultRef = React.useRef('');

  if (!content?.trim()) return null;

  const handleEnhance = async () => {
    setLoading(true);
    setEnhanced('');
    resultRef.current = '';

    const lang = language === 'ar' ? 'Arabic' : 'English';

    await streamAI({
      feature: 'note_enhancement',
      prompt: `Enhance this legal note written by a lawyer. Make it professional, well-structured, and grammatically correct while preserving the original meaning. The output should be in ${lang} using Iraqi legal terminology.\n\nOriginal note:\n${content}\n\nContext: This note is for a ${entityType} at an Iraqi law firm.\n\nOutput only the enhanced text.`,
      language: language as any,
      onDelta: (chunk) => { resultRef.current += chunk; setEnhanced(resultRef.current); },
      onDone: () => {
        setLoading(false);
        if (profile?.organization_id) {
          supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id, user_id: profile.id,
            feature: 'note_enhancement', total_tokens: 0, model: 'google/gemini-3-flash-preview',
            input_preview: content.slice(0, 200), output_preview: resultRef.current.slice(0, 200), status: 'success',
          } as any).then(() => {});
        }
      },
      onError: () => setLoading(false),
    });
  };

  const handleAccept = () => { onAccept(enhanced); setEnhanced(''); };
  const handleDiscard = () => setEnhanced('');

  return (
    <div className="space-y-2">
      {!enhanced && (
        <button
          type="button"
          onClick={handleEnhance}
          disabled={loading}
          className="text-[11px] text-accent flex items-center gap-1 hover:underline disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {language === 'ar' ? 'تحسين بالذكاء الاصطناعي' : 'Enhance with AI'}
        </button>
      )}

      {enhanced && (
        <div className="border border-accent/30 rounded-md bg-accent/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-body-sm font-medium text-accent">
            <Sparkles size={12} />
            {language === 'ar' ? 'النص المحسّن' : 'Enhanced Version'}
          </div>
          <p className="text-body-sm text-foreground whitespace-pre-wrap">{enhanced}</p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={handleAccept} className="h-7 text-xs">
              <Check size={12} className="me-1" />{language === 'ar' ? 'قبول' : 'Accept'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDiscard} className="h-7 text-xs text-muted-foreground">
              <X size={12} className="me-1" />{language === 'ar' ? 'تجاهل' : 'Discard'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
