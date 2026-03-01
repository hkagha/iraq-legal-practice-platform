import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-[120px] font-bold leading-none text-muted-foreground/20">404</h1>
        <h2 className="text-heading-lg text-foreground">{t('common.pageNotFound')}</h2>
        <p className="text-body-md text-muted-foreground">{t('common.pageNotFoundDesc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/dashboard')} className="gap-2">
            <Home className="h-4 w-4" />
            {t('common.goToDashboard')}
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.goBack')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
