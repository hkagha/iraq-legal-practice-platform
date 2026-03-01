import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sparkles, Loader2, Copy, AlertTriangle, CheckCircle2, XCircle,
  Shield, FileText,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AIContractReviewProps {
  documentContent: string;
  documentTitle: string;
  caseData?: Record<string, any>;
  clientData?: Record<string, any>;
}

const STANDARD_CLAUSES = [
  { key: 'dispute_resolution', en: 'Dispute Resolution', ar: 'حل النزاعات' },
  { key: 'governing_law', en: 'Governing Law', ar: 'القانون الحاكم' },
  { key: 'termination', en: 'Termination Clause', ar: 'بند الإنهاء' },
  { key: 'confidentiality', en: 'Confidentiality', ar: 'السرية' },
  { key: 'payment_terms', en: 'Payment Terms', ar: 'شروط الدفع' },
  { key: 'force_majeure', en: 'Force Majeure', ar: 'القوة القاهرة' },
  { key: 'liability', en: 'Limitation of Liability', ar: 'تحديد المسؤولية' },
];

export default function AIContractReview({ documentContent, documentTitle, caseData, clientData }: AIContractReviewProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const resultRef = useRef('');

  const handleReview = async () => {
    setLoading(true);
    setResult('');
    resultRef.current = '';

    const lang = language === 'ar' ? 'Arabic' : 'English';
    let contextStr = '';
    if (caseData) contextStr += `\nCase: ${caseData.title} (${caseData.case_type})`;
    if (clientData) contextStr += `\nClient: ${clientData.name}`;

    const prompt = `Review this Iraqi legal contract titled "${documentTitle}". Identify:\n1. Overall assessment (score 1-10)\n2. Issues found (severity: High/Medium/Low, description, suggested fix)\n3. Missing standard clauses from: dispute resolution, governing law, termination, confidentiality, payment terms, force majeure, limitation of liability\n4. Compliance concerns with Iraqi law\n5. Specific recommendations\n${contextStr}\n\nContract content:\n${documentContent.slice(0, 8000)}\n\nRespond in ${lang}. Be specific and cite sections where possible.`;

    await streamAI({
      feature: 'contract_review',
      prompt,
      language: language as any,
      caseData,
      clientData,
      onDelta: (chunk) => { resultRef.current += chunk; setResult(resultRef.current); },
      onDone: () => {
        setLoading(false);
        if (profile?.organization_id) {
          supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id, user_id: profile.id,
            feature: 'contract_review', total_tokens: 0, model: 'google/gemini-3-flash-preview',
            input_preview: documentTitle, output_preview: resultRef.current.slice(0, 500), status: 'success',
          } as any).then(() => {});
        }
      },
      onError: (err) => {
        setLoading(false);
        toast({ title: 'Error', description: err, variant: 'destructive' });
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast({ title: language === 'ar' ? 'تم النسخ!' : 'Copied!' });
  };

  if (!result && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={handleReview}>
        <Sparkles size={14} className="me-1.5 text-accent" />
        {language === 'ar' ? 'مراجعة بالذكاء الاصطناعي' : 'AI Review'}
      </Button>
    );
  }

  return (
    <div className="border-t border-border pt-4 mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-accent" />
        <h4 className="text-heading-sm font-semibold">
          {language === 'ar' ? 'مراجعة العقد بالذكاء الاصطناعي' : 'AI Contract Review'}
        </h4>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4">
          <Loader2 size={16} className="animate-spin text-accent" />
          <span className="text-body-md text-muted-foreground">
            {language === 'ar' ? 'مراجعة العقد...' : 'Reviewing contract...'}
          </span>
        </div>
      )}

      {result && (
        <>
          <div className="bg-accent/5 border border-accent/20 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
            <p className="text-body-sm text-foreground/80">
              {language === 'ar' ? 'يجب مراجعة هذا التحليل قبل الاعتماد عليه.' : 'This analysis should be reviewed before relying on it.'}
            </p>
          </div>

          <div className={cn('text-body-md text-foreground whitespace-pre-wrap leading-relaxed', loading && 'animate-pulse')}>
            {result}
            {loading && <span className="inline-block w-2 h-5 bg-accent animate-pulse ms-0.5" />}
          </div>

          {!loading && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy size={14} className="me-1.5" />{language === 'ar' ? 'نسخ' : 'Copy Review'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReview}>
                <Sparkles size={14} className="me-1.5" />{language === 'ar' ? 'إعادة المراجعة' : 'Re-review'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
