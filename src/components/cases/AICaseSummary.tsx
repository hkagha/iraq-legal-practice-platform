import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAI } from '@/lib/aiService';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, RefreshCw, Copy, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

interface AICaseSummaryProps {
  caseData: any;
  clientInfo: any;
  hearings: any[];
  notes: any[];
}

interface SummaryData {
  overview?: string;
  keyFacts?: string[];
  timeline?: { date: string; event: string }[];
  currentStatus?: string;
  nextSteps?: string[];
  riskAssessment?: { level: string; factors: string[] };
}

export default function AICaseSummary({ caseData, clientInfo, hearings, notes }: AICaseSummaryProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(() => {
    try {
      return caseData.ai_summary ? (typeof caseData.ai_summary === 'string' ? JSON.parse(caseData.ai_summary) : caseData.ai_summary) : null;
    } catch { return null; }
  });
  const [generatedAt, setGeneratedAt] = useState<string | null>(caseData.ai_summary_generated_at);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true, keyFacts: true, timeline: false, currentStatus: true, nextSteps: true, riskAssessment: true,
  });

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const getClientName = () => {
    if (!clientInfo) return 'N/A';
    if (clientInfo.client_type === 'company') return clientInfo.company_name || '';
    return `${clientInfo.first_name || ''} ${clientInfo.last_name || ''}`.trim();
  };

  const handleGenerate = async () => {
    if (!profile?.organization_id) return;
    setGenerating(true);

    const hearingsList = hearings
      .map(h => `- ${h.hearing_date}: ${h.hearing_type} — ${h.status}${h.outcome ? ' — ' + h.outcome : ''}`)
      .join('\n');

    const notesList = notes
      .slice(0, 10)
      .map(n => `- ${n.content?.slice(0, 200)} (${format(new Date(n.created_at), 'yyyy-MM-dd')})`)
      .join('\n');

    const prompt = `Summarize this legal case:

Case: ${caseData.title} (${caseData.case_number})
Type: ${caseData.case_type}, Court: ${caseData.court_name || 'N/A'}
Client: ${getClientName()}
Opposing: ${caseData.opposing_party_name || 'N/A'}
Status: ${caseData.status}, Priority: ${caseData.priority}
Filed: ${caseData.filing_date || 'N/A'}

Hearings:
${hearingsList || 'None'}

Recent Notes:
${notesList || 'None'}

Provide a JSON response with:
1. overview (2-3 paragraphs)
2. keyFacts (array of strings)
3. timeline (array of {date, event})
4. currentStatus (string)
5. nextSteps (array of strings)
6. riskAssessment ({level: high|medium|low, factors: string[]})`;

    let fullContent = '';

    await streamAI({
      feature: 'case_summary',
      prompt,
      language: language as any,
      onDelta: (chunk) => {
        fullContent += chunk;
      },
      onDone: async () => {
        setGenerating(false);
        try {
          // Try to parse JSON from the response
          let jsonStr = fullContent;
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonStr = jsonMatch[0];
          const parsed = JSON.parse(jsonStr) as SummaryData;
          setSummary(parsed);
          setGeneratedAt(new Date().toISOString());

          // Save to DB
          await supabase.from('cases').update({
            ai_summary: parsed as any,
            ai_summary_generated_at: new Date().toISOString(),
          } as any).eq('id', caseData.id);

          // Log usage
          await supabase.from('ai_usage_log').insert({
            organization_id: profile.organization_id,
            user_id: profile.id,
            feature: 'case_summary',
            total_tokens: 0,
            model: 'google/gemini-3-flash-preview',
            input_preview: prompt.slice(0, 200),
            output_preview: fullContent.slice(0, 200),
            status: 'success',
          } as any);
        } catch {
          // If JSON parse fails, store raw as overview
          const fallback: SummaryData = { overview: fullContent };
          setSummary(fallback);
          setGeneratedAt(new Date().toISOString());
          await supabase.from('cases').update({
            ai_summary: fallback as any,
            ai_summary_generated_at: new Date().toISOString(),
          } as any).eq('id', caseData.id);
        }
      },
      onError: (err) => {
        setGenerating(false);
        toast({ title: t('ai.title'), description: err, variant: 'destructive' });
      },
    });
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = [
      summary.overview,
      summary.keyFacts?.length ? `\n${t('ai.summary.keyFacts')}:\n${summary.keyFacts.map(f => `• ${f}`).join('\n')}` : '',
      summary.currentStatus ? `\n${t('ai.summary.currentStatus')}: ${summary.currentStatus}` : '',
      summary.nextSteps?.length ? `\n${t('ai.summary.nextSteps')}:\n${summary.nextSteps.map(s => `• ${s}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: language === 'ar' ? 'تم النسخ!' : 'Copied!' });
  };

  const riskColors: Record<string, string> = {
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };

  const SectionHeader = ({ sectionKey, label }: { sectionKey: string; label: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-2 text-heading-sm font-semibold text-foreground hover:text-accent transition-colors"
    >
      {label}
      {openSections[sectionKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-accent to-blue-500" />

      <div className="p-5">
        {!summary && !generating ? (
          /* No summary yet */
          <div className="text-center py-4">
            <Sparkles size={32} className="text-accent mx-auto mb-3" />
            <h3 className="text-heading-sm font-semibold text-foreground mb-1">{t('ai.summary.title')}</h3>
            <p className="text-body-sm text-muted-foreground mb-4 max-w-md mx-auto">{t('ai.summary.subtitle')}</p>
            <Button onClick={handleGenerate} variant="outline" className="border-accent text-accent hover:bg-accent/10">
              <Sparkles size={14} className="me-2" />{t('ai.summary.generate')}
            </Button>
          </div>
        ) : generating ? (
          /* Generating state */
          <div className="text-center py-8">
            <Loader2 size={32} className="text-accent mx-auto mb-3 animate-spin" />
            <p className="text-body-md font-medium text-foreground">{t('ai.summary.generating')}</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              {language === 'ar' ? 'قد يستغرق ١٥-٣٠ ثانية' : 'This may take 15-30 seconds'}
            </p>
          </div>
        ) : summary && (
          /* Summary display */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                <h3 className="text-heading-sm font-semibold text-foreground">{t('ai.summary.title')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {generatedAt && (
                  <span className="text-body-sm text-muted-foreground">
                    {t('ai.summary.lastGenerated')}: {formatDistanceToNow(new Date(generatedAt), { addSuffix: true, locale: language === 'ar' ? arLocale : undefined })}
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={handleCopy}><Copy size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate}><RefreshCw size={14} /></Button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <AlertTriangle size={12} />
              <span>{t('ai.disclaimer')}</span>
            </div>

            {/* Sections */}
            {summary.overview && (
              <div>
                <SectionHeader sectionKey="overview" label={t('ai.summary.overview')} />
                {openSections.overview && (
                  <p className="text-body-md text-muted-foreground whitespace-pre-wrap pb-2">{summary.overview}</p>
                )}
              </div>
            )}

            {summary.keyFacts?.length ? (
              <div>
                <SectionHeader sectionKey="keyFacts" label={t('ai.summary.keyFacts')} />
                {openSections.keyFacts && (
                  <ul className="list-disc list-inside space-y-1 text-body-md text-muted-foreground ps-2 pb-2">
                    {summary.keyFacts.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
            ) : null}

            {summary.timeline?.length ? (
              <div>
                <SectionHeader sectionKey="timeline" label={t('ai.summary.timeline')} />
                {openSections.timeline && (
                  <div className="space-y-2 ps-2 pb-2">
                    {summary.timeline.map((item, i) => (
                      <div key={i} className="flex gap-3 text-body-sm">
                        <span className="text-muted-foreground font-mono shrink-0">{item.date}</span>
                        <span className="text-foreground">{item.event}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {summary.currentStatus && (
              <div>
                <SectionHeader sectionKey="currentStatus" label={t('ai.summary.currentStatus')} />
                {openSections.currentStatus && (
                  <p className="text-body-md text-muted-foreground pb-2">{summary.currentStatus}</p>
                )}
              </div>
            )}

            {summary.nextSteps?.length ? (
              <div>
                <SectionHeader sectionKey="nextSteps" label={t('ai.summary.nextSteps')} />
                {openSections.nextSteps && (
                  <ul className="list-decimal list-inside space-y-1 text-body-md text-muted-foreground ps-2 pb-2">
                    {summary.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </div>
            ) : null}

            {summary.riskAssessment && (
              <div>
                <SectionHeader sectionKey="riskAssessment" label={t('ai.summary.riskAssessment')} />
                {openSections.riskAssessment && (
                  <div className="pb-2">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-body-sm font-medium border mb-2',
                      riskColors[summary.riskAssessment.level] || riskColors.medium,
                    )}>
                      {summary.riskAssessment.level?.toUpperCase()}
                    </span>
                    {summary.riskAssessment.factors?.length ? (
                      <ul className="list-disc list-inside space-y-1 text-body-sm text-muted-foreground ps-2">
                        {summary.riskAssessment.factors.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
