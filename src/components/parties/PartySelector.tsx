import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParties } from '@/hooks/useParties';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';
import { PartyChip } from './PartyChip';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Building2, ChevronDown, Plus, Search, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartyRef } from '@/types/parties';

interface PartySelectorProps {
  value?: PartyRef | null;
  onChange: (ref: PartyRef | null) => void;
  /** Restrict picker to one type. Defaults to allowing both. */
  allowedTypes?: ('person' | 'entity')[];
  placeholder?: string;
  placeholderAr?: string;
  disabled?: boolean;
  error?: boolean;
  /** Show "+ New person" / "+ New entity" buttons inside the popover. */
  onCreatePerson?: () => void;
  onCreateEntity?: () => void;
  className?: string;
}

/** Searchable picker that returns either a person or an entity reference. */
export function PartySelector({
  value,
  onChange,
  allowedTypes = ['person', 'entity'],
  placeholder = 'Select a party…',
  placeholderAr = 'اختر طرفًا…',
  disabled,
  error,
  onCreatePerson,
  onCreateEntity,
  className,
}: PartySelectorProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const partiesQuery = useParties({
    search,
    type: allowedTypes.length === 1 ? allowedTypes[0] : 'all',
    enabled: open,
    limit: 30,
  });

  const handlePick = (partyType: 'person' | 'entity', id: string, displayName: string) => {
    onChange({
      partyType,
      personId: partyType === 'person' ? id : null,
      entityId: partyType === 'entity' ? id : null,
      displayName,
    });
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'h-11 w-full inline-flex items-center justify-between gap-2 rounded-input border border-slate-300 bg-card px-3 text-start text-body-md transition-colors',
            'hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-60 cursor-not-allowed',
            className,
          )}
        >
          <span className="min-w-0 flex-1 flex items-center gap-2">
            {value ? (
              <PartyChip partyType={value.partyType} displayName={value.displayName} showTypeBadge size="sm" />
            ) : (
              <span className="text-muted-foreground truncate">{language === 'ar' ? placeholderAr : placeholder}</span>
            )}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(null);
                }}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown size={14} className="text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[360px]" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث بالاسم أو الهاتف…' : 'Search by name or phone…'}
              className="h-9 ps-8"
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto py-1">
          {partiesQuery.isLoading && (
            <div className="px-3 py-6 text-center text-body-sm text-muted-foreground">
              {language === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}
            </div>
          )}
          {!partiesQuery.isLoading && (partiesQuery.data?.length ?? 0) === 0 && (
            <div className="px-3 py-6 text-center text-body-sm text-muted-foreground">
              {language === 'ar' ? 'لا توجد نتائج' : 'No matches'}
            </div>
          )}
          {partiesQuery.data?.map((row) => {
            const name =
              row.partyType === 'person'
                ? resolvePersonName(row.person!, language as 'en' | 'ar')
                : resolveEntityName(row.entity!, language as 'en' | 'ar');
            return (
              <button
                key={`${row.partyType}-${row.id}`}
                type="button"
                onClick={() => handlePick(row.partyType, row.id, name)}
                className="w-full text-start px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
              >
                <PartyChip partyType={row.partyType} displayName={name} size="sm" showTypeBadge />
              </button>
            );
          })}
        </div>

        {(onCreatePerson || onCreateEntity) && (
          <div className="border-t border-border p-2 flex gap-1.5">
            {onCreatePerson && allowedTypes.includes('person') && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={() => {
                  setOpen(false);
                  onCreatePerson();
                }}
              >
                <Plus size={13} className="me-1" /> <User size={13} className="me-1" />
                {language === 'ar' ? 'فرد' : 'Person'}
              </Button>
            )}
            {onCreateEntity && allowedTypes.includes('entity') && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={() => {
                  setOpen(false);
                  onCreateEntity();
                }}
              >
                <Plus size={13} className="me-1" /> <Building2 size={13} className="me-1" />
                {language === 'ar' ? 'شركة' : 'Company'}
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
