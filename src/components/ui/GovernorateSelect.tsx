import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormSearchSelect } from './FormSearchSelect';
import { IRAQ_GOVERNORATES } from '@/lib/referenceData';

interface GovernorateSelectProps {
  value?: string | null;
  onChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

/** Searchable picker for one of Iraq's 18 governorates. Emits the short code. */
export function GovernorateSelect({ value, onChange, placeholder, disabled, error }: GovernorateSelectProps) {
  const { language } = useLanguage();
  const options = useMemo(
    () =>
      IRAQ_GOVERNORATES.map(g => ({
        value: g.code,
        label: language === 'ar' ? g.nameAr : g.name,
        subtitle: language === 'ar' ? g.name : g.nameAr,
      })),
    [language]
  );
  return (
    <FormSearchSelect
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder={placeholder || (language === 'ar' ? 'اختر المحافظة' : 'Select governorate')}
      disabled={disabled}
      error={error}
    />
  );
}
