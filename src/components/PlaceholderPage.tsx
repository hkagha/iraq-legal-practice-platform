import { useLanguage } from '@/contexts/LanguageContext';
import { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  titleKey: string;
  icon: LucideIcon;
}

const PlaceholderPage = ({ titleKey, icon: Icon }: PlaceholderPageProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Icon className="h-12 w-12 text-slate-300" strokeWidth={1.5} />
      <h1 className="text-display-lg text-foreground">{t(titleKey)}</h1>
      <p className="text-body-lg text-muted-foreground">{t('placeholder.underDevelopment')}</p>
    </div>
  );
};

export default PlaceholderPage;
