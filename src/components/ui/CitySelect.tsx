import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormSearchSelect } from './FormSearchSelect';
import { FormInput } from './FormInput';
import { getCitiesForGovernorate, IRAQ_GOVERNORATES } from '@/lib/referenceData';

interface CitySelectProps {
  value?: string | null;
  onChange?: (city: string) => void;
  /** Iraq governorate code — when set, restricts the city list to that governorate. */
  governorateCode?: string | null;
  /** ISO country code; when not 'IQ' the field falls back to free-text. */
  countryCode?: string | null;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Use Arabic names. Defaults to language context. */
  language?: 'en' | 'ar';
  /** Free-text fallback input id (for label association). */
  id?: string;
}

/**
 * City picker with three modes:
 *   1. Iraq + governorate → searchable dropdown of that governorate's cities.
 *   2. Iraq, no governorate → searchable dropdown of all 18 governorates (used as cities for the city field).
 *   3. Other country → free-text input.
 *
 * Always emits a string (the chosen city or typed text).
 */
export function CitySelect({
  value,
  onChange,
  governorateCode,
  countryCode = 'IQ',
  placeholder,
  disabled,
  error,
  language: langProp,
  id,
}: CitySelectProps) {
  const { language: ctxLanguage } = useLanguage();
  const language = langProp || (ctxLanguage as 'en' | 'ar');
  const isIraq = !countryCode || countryCode === 'IQ';

  const options = useMemo(() => {
    if (!isIraq) return [];
    if (governorateCode) {
      return getCitiesForGovernorate(governorateCode).map(c => ({
        value: language === 'ar' ? c.nameAr : c.name,
        label: language === 'ar' ? c.nameAr : c.name,
        subtitle: language === 'ar' ? c.name : c.nameAr,
      }));
    }
    // No governorate selected — let the user pick a governorate centre as the city
    return IRAQ_GOVERNORATES.flatMap(g =>
      g.cities.map(c => ({
        value: language === 'ar' ? c.nameAr : c.name,
        label: language === 'ar' ? c.nameAr : c.name,
        subtitle: `${language === 'ar' ? g.nameAr : g.name}`,
      }))
    );
  }, [isIraq, governorateCode, language]);

  if (!isIraq) {
    return (
      <FormInput
        id={id}
        value={value || ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder || (language === 'ar' ? 'المدينة' : 'City')}
        disabled={disabled}
        error={error}
      />
    );
  }

  return (
    <FormSearchSelect
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder={placeholder || (language === 'ar' ? 'اختر المدينة' : 'Select city')}
      disabled={disabled}
      error={error}
    />
  );
}
