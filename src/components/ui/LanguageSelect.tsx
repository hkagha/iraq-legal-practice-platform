import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormSearchSelect } from './FormSearchSelect';
import { LANGUAGES } from '@/lib/referenceData';

interface LanguageSelectProps {
  value?: string | null;
  onChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export function LanguageSelect({ value, onChange, placeholder, disabled, error }: LanguageSelectProps) {
  const { language } = useLanguage();
  const options = useMemo(
    () =>
      LANGUAGES.map(l => ({
        value: l.code,
        label: language === 'ar' ? l.nameAr : l.name,
        subtitle: l.nativeName,
      })),
    [language]
  );
  return (
    <FormSearchSelect
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder={placeholder || (language === 'ar' ? 'اختر اللغة' : 'Select language')}
      disabled={disabled}
      error={error}
    />
  );
}
