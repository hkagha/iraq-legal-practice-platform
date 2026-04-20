import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  COUNTRIES,
  getCountriesForSelect,
  parsePhone,
  buildE164,
  getCountryByCode,
  Country,
} from '@/lib/referenceData';

interface PhoneInputProps {
  /** Stored E.164 string e.g. "+9647712345678". */
  value?: string | null;
  /** Called with the canonical "+<dial><digits>" string, or '' when cleared. */
  onChange?: (e164: string) => void;
  /** Defaults to 'IQ' when no value is set. */
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Optional id for the underlying number input (label association). */
  id?: string;
  /** Disables the country picker, useful for view-only contexts. */
  countryLocked?: boolean;
}

/**
 * Phone input with searchable country-code dropdown + national number entry.
 * Always emits canonical E.164 ("+<dial><digits>") to onChange.
 */
export function PhoneInput({
  value,
  onChange,
  defaultCountry = 'IQ',
  placeholder,
  disabled,
  error,
  id,
  countryLocked,
}: PhoneInputProps) {
  const { language } = useLanguage();
  const initial = useMemo(() => {
    if (value) return parsePhone(value);
    const fallback = getCountryByCode(defaultCountry) || COUNTRIES[0];
    return { country: fallback, national: '' };
  }, [value, defaultCountry]);

  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync if parent updates the value externally
  useEffect(() => {
    if (value === undefined) return;
    if (!value) {
      setNational('');
      return;
    }
    const parsed = parsePhone(value);
    setCountry(parsed.country);
    setNational(parsed.national);
  }, [value]);

  // Click-outside handling
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCountries = useMemo(() => {
    const list = getCountriesForSelect(language as 'en' | 'ar');
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(search) ||
        c.dialCode.includes(q.replace(/\D/g, '')) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search, language]);

  const emit = (nextCountry: Country, nextNational: string) => {
    onChange?.(nextNational ? buildE164(nextCountry.dialCode, nextNational) : '');
  };

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch('');
    emit(c, national);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip leading '+' or country dial code if user pasted a full number
    let raw = e.target.value.replace(/[^\d]/g, '');
    if (raw.startsWith(country.dialCode)) {
      raw = raw.slice(country.dialCode.length);
    }
    setNational(raw);
    emit(country, raw);
  };

  return (
    <div
      className={cn(
        'flex items-stretch w-full rounded-input border border-slate-300 bg-card transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:border-accent',
        error && 'border-destructive focus-within:ring-destructive',
        disabled && 'opacity-70 cursor-not-allowed'
      )}
      dir="ltr"
    >
      {/* Country code picker */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          disabled={disabled || countryLocked}
          onClick={() => setOpen(o => !o)}
          className={cn(
            'h-11 inline-flex items-center gap-1.5 px-3 text-body-sm text-foreground border-e border-slate-300',
            'hover:bg-muted/50 transition-colors rounded-s-input',
            (disabled || countryLocked) && 'cursor-not-allowed hover:bg-transparent'
          )}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="tabular-nums">+{country.dialCode}</span>
          {!countryLocked && <ChevronDown size={14} className="text-muted-foreground" />}
        </button>

        {open && (
          <div className="absolute z-50 top-full mt-1 start-0 w-[300px] bg-card border border-border rounded-card shadow-lg">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث عن بلد...' : 'Search country…'}
                  className="w-full h-8 ps-8 pe-2 text-body-sm rounded-sm border border-border bg-background outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              {filteredCountries.length === 0 && (
                <p className="px-3 py-4 text-body-sm text-muted-foreground text-center">
                  {language === 'ar' ? 'لا نتائج' : 'No results'}
                </p>
              )}
              {filteredCountries.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-start hover:bg-muted/50 transition-colors',
                    c.code === country.code && 'bg-accent/10'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="text-body-sm text-foreground truncate">
                      {language === 'ar' ? c.nameAr : c.name}
                    </span>
                  </span>
                  <span className="text-body-sm text-muted-foreground tabular-nums">+{c.dialCode}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* National number */}
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={national}
        onChange={handleNumberChange}
        disabled={disabled}
        placeholder={placeholder || (language === 'ar' ? 'رقم الهاتف' : 'Phone number')}
        className={cn(
          'flex-1 min-w-0 h-11 px-3 text-body-md bg-transparent outline-none rounded-e-input tabular-nums',
          disabled && 'cursor-not-allowed'
        )}
      />
    </div>
  );
}
