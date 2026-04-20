import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormSearchSelect } from './FormSearchSelect';
import { getCountriesForSelect, getCountryByCode } from '@/lib/referenceData';

interface CountrySelectProps {
  /** ISO 3166-1 alpha-2 country code (e.g. 'IQ'). */
  value?: string | null;
  onChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

/**
 * Searchable country dropdown with flag + bilingual labels.
 * Iraq and regional neighbors are pinned to the top of the list.
 */
export function CountrySelect({ value, onChange, placeholder, disabled, error }: CountrySelectProps) {
  const { language } = useLanguage();

  const options = useMemo(
    () =>
      getCountriesForSelect(language as 'en' | 'ar').map(c => ({
        value: c.code,
        label: `${c.flag}  ${language === 'ar' ? c.nameAr : c.name}`,
        subtitle: `${language === 'ar' ? c.name : c.nameAr} · +${c.dialCode}`,
      })),
    [language]
  );

  const fallbackPlaceholder = language === 'ar' ? 'اختر الدولة' : 'Select country';
  const selected = getCountryByCode(value || undefined);

  return (
    <FormSearchSelect
      value={selected?.code}
      onChange={onChange}
      options={options}
      placeholder={placeholder || fallbackPlaceholder}
      disabled={disabled}
      error={error}
    />
  );
}
