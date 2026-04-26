import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, Users as UsersIcon, Building2, MapPin, Tag, CalendarDays, Scale, Hash, Coins, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { reindexDocument } from '@/lib/documentIndexing';
import { toast } from 'sonner';

interface Props {
  document: any;
  onChanged?: () => void;
}

interface StatuteRef { name?: string; number?: string; year?: string; article?: string }
interface AmountRef { value?: string; currency?: string }
interface PartyRef { name?: string; role?: string }

export default function DocumentAIIndexPanel({ document, onChanged }: Props) {
  const { language } = useLanguage();
  const isAR = language === 'ar';
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(document?.indexing_status || 'pending');

  useEffect(() => { setLocalStatus(document?.indexing_status || 'pending'); }, [document?.id, document?.indexing_status]);

  const handleReindex = async () => {
    if (!document?.id) return;
    setBusy(true);
    setLocalStatus('processing');
    const res = await reindexDocument(document.id);
    if (res.ok) {
      toast.success(isAR ? 'تم إعادة الفهرسة' : 'Re-indexed successfully');
      onChanged?.();
    } else {
      toast.error(res.error || (isAR ? 'فشلت الفهرسة' : 'Indexing failed'));
    }
    setBusy(false);
  };

  const summary = document?.ai_summary as string | null;
  const docType = document?.ai_doc_type as string | null;
  const people = (document?.ai_people || []) as string[];
  const orgs = (document?.ai_organizations || []) as string[];
  const places = (document?.ai_places || []) as string[];
  const tags = (document?.ai_tags || []) as string[];
  const dates = (Array.isArray(document?.ai_dates) ? document.ai_dates : []) as Array<{ date: string; type?: string; label?: string }>;
  const statutes = (Array.isArray(document?.ai_statutes) ? document.ai_statutes : []) as StatuteRef[];
  const caseNumbers = (document?.ai_case_numbers || []) as string[];
  const amounts = (Array.isArray(document?.ai_amounts) ? document.ai_amounts : []) as AmountRef[];
  const parties = (Array.isArray(document?.ai_parties) ? document.ai_parties : []) as PartyRef[];
  const lang = document?.ai_language as string | null;
  const err = document?.indexing_error as string | null;

  const status = localStatus;
  const isDone = status === 'done';
  const isProcessing = status === 'processing';
  const isFailed = status === 'failed';

  return (
    <div className="border border-border rounded-md bg-card/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h4 className="font-display text-[15px] text-foreground">
            {isAR ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
          </h4>
          {docType && isDone && (
            <Badge variant="outline" className="text-[11px] ms-1">{docType}</Badge>
          )}
          {lang && isDone && (
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{lang}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReindex}
          disabled={busy || isProcessing}
          className="h-8"
        >
          {(busy || isProcessing) ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 me-1.5" />}
          {isDone
            ? (isAR ? 'إعادة الفهرسة' : 'Re-analyze')
            : (isAR ? 'تحليل' : 'Analyze')}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {!isDone && !isFailed && (
          <p className="text-body-sm text-muted-foreground">
            {isProcessing
              ? (isAR ? 'جارِ تحليل المستند...' : 'Analyzing document with AI…')
              : (isAR
                  ? 'لم يتم تحليل هذا المستند بعد. اضغط "تحليل" لاستخراج الأشخاص والمؤسسات والقوانين والأرقام والتواريخ تلقائياً.'
                  : 'Not analyzed yet. Click "Analyze" to extract people, organisations, statutes, case numbers, amounts, parties, and key dates.')}
          </p>
        )}

        {isFailed && (
          <div className="text-body-sm text-destructive">
            {isAR ? 'فشل التحليل' : 'Analysis failed'}{err ? `: ${err}` : ''}
          </div>
        )}

        {isDone && summary && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1">{isAR ? 'ملخص' : 'Summary'}</div>
            <p className="text-body-md text-foreground/90 leading-relaxed">{summary}</p>
          </div>
        )}

        {isDone && parties.length > 0 && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Gavel className="h-3 w-3" />
              {isAR ? 'الأطراف' : 'Parties'}
            </div>
            <div className="space-y-1">
              {parties.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-body-sm border-b border-border/40 last:border-0 py-1.5">
                  <span className="font-medium text-foreground">{p.name || ''}</span>
                  {p.role && <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{p.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {isDone && statutes.length > 0 && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Scale className="h-3 w-3" />
              {isAR ? 'القوانين والمواد' : 'Statutes cited'}
            </div>
            <div className="space-y-1">
              {statutes.map((s, i) => {
                const head = [s.name, s.number ? `رقم ${s.number}` : null, s.year ? `لسنة ${s.year}` : null].filter(Boolean).join(' ');
                return (
                  <div key={i} className="flex items-center justify-between text-body-sm border-b border-border/40 last:border-0 py-1.5">
                    <span className="text-foreground">{head || s.name || ''}</span>
                    {s.article && <span className="text-[11px] tabular-nums text-accent-dark">{isAR ? `المادة ${s.article}` : `Art. ${s.article}`}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isDone && caseNumbers.length > 0 && (
          <Section icon={Hash} label={isAR ? 'أرقام القضايا والملفات' : 'Case / file numbers'} items={caseNumbers} mono />
        )}

        {isDone && amounts.length > 0 && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Coins className="h-3 w-3" />
              {isAR ? 'المبالغ' : 'Amounts'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {amounts.map((a, i) => (
                <span key={i} className="text-body-sm tabular-nums rounded bg-accent/10 text-accent-dark px-2 py-1">
                  {a.value} <span className="opacity-70">{a.currency}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {isDone && people.length > 0 && (
          <Section icon={UsersIcon} label={isAR ? 'الأشخاص' : 'People'} items={people} />
        )}
        {isDone && orgs.length > 0 && (
          <Section icon={Building2} label={isAR ? 'المؤسسات' : 'Organizations'} items={orgs} />
        )}
        {isDone && places.length > 0 && (
          <Section icon={MapPin} label={isAR ? 'الأماكن' : 'Places'} items={places} />
        )}
        {isDone && tags.length > 0 && (
          <Section icon={Tag} label={isAR ? 'الوسوم' : 'Tags'} items={tags} muted />
        )}

        {isDone && dates.length > 0 && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              {isAR ? 'تواريخ مهمة' : 'Key dates'}
            </div>
            <div className="space-y-1">
              {dates.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-body-sm border-b border-border/40 last:border-0 py-1.5">
                  <span className="text-muted-foreground">{d.type || 'date'}{d.label ? ` — ${d.label}` : ''}</span>
                  <span className="font-medium tabular-nums">{d.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, label, items, muted, mono }: { icon: any; label: string; items: string[]; muted?: boolean; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((v, i) => (
          <span key={`${v}-${i}`} className={`text-[11px] rounded px-2 py-0.5 ${muted ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'} ${mono ? 'font-mono tabular-nums' : ''}`}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
