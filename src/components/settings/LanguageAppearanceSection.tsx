import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Globe, Sun, Moon, Monitor } from 'lucide-react';

export default function LanguageAppearanceSection() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'اللغة والمظهر' : 'Language & Appearance'}</h2>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'اللغة' : 'Language'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLanguage('en')}
            className={cn(
              'p-4 rounded-lg border-2 text-center transition-colors',
              language === 'en' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
            )}
          >
            <span className="text-2xl block mb-1">🇬🇧</span>
            <span className="text-body-lg font-medium">English</span>
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={cn(
              'p-4 rounded-lg border-2 text-center transition-colors',
              language === 'ar' ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'
            )}
          >
            <span className="text-2xl block mb-1">🇮🇶</span>
            <span className="text-body-lg font-medium">العربية</span>
          </button>
        </div>
        <p className="text-body-sm text-muted-foreground">
          {language === 'ar' ? 'اتجاه النص يتبع اللغة المختارة تلقائياً' : 'Text direction automatically follows the selected language'}
        </p>
      </div>

      {/* Theme */}
      <div className="border-t pt-6 space-y-3">
        <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'المظهر' : 'Theme'}</h3>
        <div className="grid grid-cols-3 gap-3">
          <button className={cn('p-4 rounded-lg border-2 border-accent bg-accent/5 text-center')}>
            <Sun size={20} className="mx-auto mb-1 text-accent" />
            <span className="text-body-md font-medium">{language === 'ar' ? 'فاتح' : 'Light'}</span>
          </button>
          <div className="p-4 rounded-lg border-2 border-border bg-muted/30 text-center opacity-50 relative">
            <Moon size={20} className="mx-auto mb-1 text-muted-foreground" />
            <span className="text-body-md text-muted-foreground">{language === 'ar' ? 'داكن' : 'Dark'}</span>
            <span className="absolute top-1 end-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {language === 'ar' ? 'قريباً' : 'Soon'}
            </span>
          </div>
          <div className="p-4 rounded-lg border-2 border-border bg-muted/30 text-center opacity-50 relative">
            <Monitor size={20} className="mx-auto mb-1 text-muted-foreground" />
            <span className="text-body-md text-muted-foreground">{language === 'ar' ? 'النظام' : 'System'}</span>
            <span className="absolute top-1 end-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {language === 'ar' ? 'قريباً' : 'Soon'}
            </span>
          </div>
        </div>
      </div>

      {/* Date Format placeholder */}
      <div className="border-t pt-6 space-y-3">
        <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}</h3>
        <select className="w-full border rounded-lg h-10 px-3 bg-card text-body-md text-foreground" defaultValue="DD/MM/YYYY">
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>

      {/* Number Format */}
      <div className="border-t pt-6 space-y-3">
        <h3 className="text-heading-md text-foreground">{language === 'ar' ? 'تنسيق الأرقام' : 'Number Format'}</h3>
        <select className="w-full border rounded-lg h-10 px-3 bg-card text-body-md text-foreground" defaultValue="western">
          <option value="western">1,234,567.89</option>
          <option value="arabic">١٬٢٣٤٬٥٦٧٫٨٩</option>
        </select>
      </div>
    </div>
  );
}
