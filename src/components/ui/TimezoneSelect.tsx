import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormSearchSelect } from './FormSearchSelect';
import { TIMEZONES } from '@/lib/referenceData';

interface TimezoneSelectProps {
  value?: string | null;
  onChange?: (tz: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export function TimezoneSelect({ value, onChange, placeholder, disabled, error }: TimezoneSelectProps) {
  const { language } = useLanguage();
  const options = useMemo(
    () =>
      TIMEZONES.map(t => ({
        value: t.value,
        label: `${language === 'ar' ? t.labelAr : t.label} (${t.offset})`,
        subtitle: t.value,
      })),
    [language]
  );
  return (
    <FormSearchSelect
      value={value || undefined}
      onChange={onChange}
      options={options}
      placeholder={placeholder || (language === 'ar' ? 'اختر المنطقة الزمنية' : 'Select timezone')}
      disabled={disabled}
      error={error}
    />
  );
}
