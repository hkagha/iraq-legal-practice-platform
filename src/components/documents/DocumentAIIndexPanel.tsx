import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, Users as UsersIcon, Building2, MapPin, Tag, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { reindexDocument } from '@/lib/documentIndexing';
import { toast } from 'sonner';

interface Props {
  document: any;
  onChanged?: () => void;
}

export default function DocumentAIIndexPanel({ document, onChanged }: Props) {
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(document?.indexing_status || 'pending');

  useEffect(() => { setLocalStatus(document?.indexing_status || 'pending'); }, [document?.id, document?.indexing_status]);

  const handleReindex = async () => {
    if (!document?.id) return;
    setBusy(true);
    setLocalStatus('processing');
    const res = await reindexDocument(document.id);
    if (res.ok) {
      toast.success(language === 'ar' ? 'تم إعادة الفهرسة' : 'Re-indexed successfully');
      onChanged?.();
    } else {
      toast.error(res.error || (language === 'ar' ? 'فشلت الفهرسة' : 'Indexing failed'));
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
            {language === 'ar' ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}
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
            ? (language === 'ar' ? 'إعادة الفهرسة' : 'Re-analyze')
            : (language === 'ar' ? 'تحليل' : 'Analyze')}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {!isDone && !isFailed && (
          <p className="text-body-sm text-muted-foreground">
            {isProcessing
              ? (language === 'ar' ? 'جارِ تحليل المستند...' : 'Analyzing document with AI…')
              : (language === 'ar'
                  ? 'لم يتم تحليل هذا المستند بعد. اضغط "تحليل" لاستخراج الأشخاص والمؤسسات والتواريخ تلقائياً.'
                  : 'Not analyzed yet. Click "Analyze" to extract people, organizations, dates and topical tags.')}
          </p>
        )}

        {isFailed && (
          <div className="text-body-sm text-destructive">
            {language === 'ar' ? 'فشل التحليل' : 'Analysis failed'}{err ? `: ${err}` : ''}
          </div>
        )}

        {isDone && summary && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1">{language === 'ar' ? 'ملخص' : 'Summary'}</div>
            <p className="text-body-md text-foreground/90 leading-relaxed">{summary}</p>
          </div>
        )}

        {isDone && people.length > 0 && (
          <Section icon={UsersIcon} label={language === 'ar' ? 'الأشخاص' : 'People'} items={people} />
        )}
        {isDone && orgs.length > 0 && (
          <Section icon={Building2} label={language === 'ar' ? 'المؤسسات' : 'Organizations'} items={orgs} />
        )}
        {isDone && places.length > 0 && (
          <Section icon={MapPin} label={language === 'ar' ? 'الأماكن' : 'Places'} items={places} />
        )}
        {isDone && tags.length > 0 && (
          <Section icon={Tag} label={language === 'ar' ? 'الوسوم' : 'Tags'} items={tags} muted />
        )}

        {isDone && dates.length > 0 && (
          <div>
            <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              {language === 'ar' ? 'تواريخ مهمة' : 'Key dates'}
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

function Section({ icon: Icon, label, items, muted }: { icon: any; label: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <div className="eyebrow text-muted-foreground mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((v, i) => (
          <span key={`${v}-${i}`} className={`text-[11px] rounded px-2 py-0.5 ${muted ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
