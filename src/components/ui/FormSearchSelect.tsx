import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface FormSearchSelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface FormSearchSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  options: FormSearchSelectOption[];
  error?: boolean;
  disabled?: boolean;
  showCreate?: boolean;
  createLabel?: string;
  onCreateNew?: () => void;
}

export function FormSearchSelect({
  value, onChange, placeholder, options, error, disabled,
  showCreate, createLabel, onCreateNew,
}: FormSearchSelectProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.subtitle?.toLowerCase().includes(q));
  }, [options, search]);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full h-11 flex items-center justify-between rounded-input border border-slate-300 px-3 text-body-md bg-card',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
          error && 'border-destructive focus:ring-destructive',
          disabled && 'opacity-70 cursor-not-allowed',
        )}
      >
        <span className={cn(!selected && 'text-slate-400')}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-card shadow-md">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="w-full h-8 ps-8 pe-2 text-body-sm rounded-sm border border-border bg-background outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-body-sm text-muted-foreground text-center">{t('common.noResults')}</p>
            )}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange?.(o.value); setOpen(false); setSearch(''); }}
                className={cn(
                  'w-full text-start px-3 py-2.5 hover:bg-muted/50 transition-colors',
                  value === o.value && 'bg-accent/10 text-accent',
                )}
              >
                <div className="text-body-md">{o.label}</div>
                {o.subtitle && <div className="text-body-sm text-muted-foreground">{o.subtitle}</div>}
              </button>
            ))}
          </div>
          {showCreate && onCreateNew && (
            <button
              type="button"
              onClick={() => { onCreateNew(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-body-sm text-accent border-t border-border hover:bg-muted/50"
            >
              <Plus size={14} /> {createLabel || t('common.create')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
