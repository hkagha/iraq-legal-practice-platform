import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormSearchSelect } from './FormSearchSelect';
import { CURRENCIES } from '@/lib/referenceData';

interface CurrencySelectProps {
  value?: string | null;
  onChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

/** ISO 4217 currency picker. IQD pinned at top by virtue of the source list ordering. */
export function CurrencySelect({ value, onChange, placeholder, disabled, error }: CurrencySelectProps) {
  const { language } = useLanguage();
  const options = useMemo(
    () =>
      CURRENCIES.map(c => ({
        value: c.code,
        label: `${c.code} — ${language === 'ar' ? c.nameAr : c.name}`,
        subtitle: c.symbol,
      })),
    [language]
  );
  return (
    <FormSearchSelect
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder={placeholder || (language === 'ar' ? 'اختر العملة' : 'Select currency')}
      disabled={disabled}
      error={error}
    />
  );
}
