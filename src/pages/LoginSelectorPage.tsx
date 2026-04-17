import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Briefcase, Users, ArrowRight } from 'lucide-react';

export default function LoginSelectorPage() {
  const { language, setLanguage } = useLanguage();
  const isEN = language === 'en';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-secondary via-background to-secondary/50">
      {/* Language toggle */}
      <div className="flex justify-end p-6">
        <div className="flex gap-2 text-body-md">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 pb-1 ${language === 'en' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}
          >EN</button>
          <button
            onClick={() => setLanguage('ar')}
            className={`px-2 pb-1 ${language === 'ar' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}
          >AR</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        <div className="w-full max-w-[720px]">
          {/* Branding */}
          <div className="text-center mb-10">
            <h1 className="text-display-sm text-primary font-bold">Qanuni</h1>
            <p className="text-body-md text-muted-foreground mt-1">
              {isEN ? 'قانوني' : 'Qanuni'}
            </p>
            <h2 className="text-heading-md text-foreground mt-6">
              {isEN ? 'Choose how you sign in' : 'اختر طريقة تسجيل الدخول'}
            </h2>
            <p className="text-body-md text-muted-foreground mt-2">
              {isEN
                ? 'Select the option that matches your account'
                : 'اختر الخيار الذي يطابق حسابك'}
            </p>
          </div>

          {/* Selector cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              to="/login/staff"
              className="group bg-card rounded-2xl border border-border hover:border-accent hover:shadow-lg transition-all p-6 flex flex-col"
            >
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-heading-sm text-foreground font-semibold">
                {isEN ? 'Law Firm Staff' : 'موظفو مكتب المحاماة'}
              </h3>
              <p className="text-body-sm text-muted-foreground mt-2 flex-1">
                {isEN
                  ? 'For lawyers, paralegals, secretaries, accountants, and firm admins.'
                  : 'للمحامين والمساعدين القانونيين والسكرتارية والمحاسبين ومديري المكتب.'}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-accent font-semibold text-body-sm group-hover:gap-2 transition-all">
                {isEN ? 'Continue' : 'متابعة'}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </span>
            </Link>

            <Link
              to="/portal/login"
              className="group bg-card rounded-2xl border border-border hover:border-accent hover:shadow-lg transition-all p-6 flex flex-col"
            >
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-accent/10 mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-heading-sm text-foreground font-semibold">
                {isEN ? 'Client Portal' : 'بوابة العملاء'}
              </h3>
              <p className="text-body-sm text-muted-foreground mt-2 flex-1">
                {isEN
                  ? 'For clients of law firms accessing their cases, documents, and invoices.'
                  : 'لعملاء مكاتب المحاماة للوصول إلى قضاياهم ومستنداتهم وفواتيرهم.'}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-accent font-semibold text-body-sm group-hover:gap-2 transition-all">
                {isEN ? 'Continue' : 'متابعة'}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </span>
            </Link>
          </div>

          {/* Discreet admin link */}
          <div className="text-center mt-10">
            <Link
              to="/admin/login"
              className="text-body-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              {isEN ? 'Platform administrator? Sign in here' : 'مدير المنصة؟ سجّل الدخول هنا'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
