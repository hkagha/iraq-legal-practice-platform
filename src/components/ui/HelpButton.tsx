import { useState } from 'react';
import { HelpCircle, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SlideOver } from '@/components/ui/SlideOver';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getHelp } from '@/lib/helpContent';
import { cn } from '@/lib/utils';

interface HelpButtonProps {
  helpKey: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function HelpButton({ helpKey, size = 'md', className }: HelpButtonProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const isEN = language === 'en';
  const entry = getHelp(helpKey);

  if (!entry) return null;

  const pick = (b: { en: string; ar: string }) => (isEN ? b.en : b.ar);
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const icon = size === 'sm' ? 14 : 16;

  return (
    <>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={isEN ? 'Help for this page' : 'مساعدة لهذه الصفحة'}
            className={cn(
              dim,
              'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-accent hover:bg-muted transition-colors',
              className,
            )}
          >
            <HelpCircle size={icon} strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {isEN ? 'How to use this page' : 'كيفية استخدام هذه الصفحة'}
        </TooltipContent>
      </Tooltip>

      <SlideOver
        isOpen={open}
        onClose={() => setOpen(false)}
        title={pick(entry.title)}
        titleAr={entry.title.ar}
        subtitle={isEN ? 'How to use this page' : 'كيفية استخدام هذه الصفحة'}
        subtitleAr="كيفية استخدام هذه الصفحة"
        width="md"
      >
        <div className="space-y-6">
          <p className="text-body-md text-foreground/80 leading-relaxed">{pick(entry.intro)}</p>

          {entry.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              <h3 className="text-heading-sm text-foreground">{pick(s.heading)}</h3>
              <p className="text-body-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {pick(s.body)}
              </p>
            </section>
          ))}

          {entry.tips && entry.tips.length > 0 && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-accent-dark">
                <Lightbulb size={14} strokeWidth={2} />
                <span className="text-label">{isEN ? 'Tips' : 'نصائح'}</span>
              </div>
              {entry.tips.map((tip, i) => (
                <p key={i} className="text-body-sm text-foreground/80 leading-relaxed">{pick(tip)}</p>
              ))}
            </div>
          )}
        </div>
      </SlideOver>
    </>
  );
}
