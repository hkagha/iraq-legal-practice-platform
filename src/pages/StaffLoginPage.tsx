import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Scale, FileText, BarChart3, Loader2, ArrowLeft } from 'lucide-react';

const StaffLoginPage = forwardRef<HTMLDivElement>((_props, _ref) => {
  const { t, language, setLanguage } = useLanguage();
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'client') {
        navigate('/portal/dashboard', { replace: true });
      } else if (['super_admin', 'sales_admin'].includes(profile.role)) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) { setError(t('auth.emailRequired')); return; }
    if (!password) { setError(t('auth.passwordRequired')); return; }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(
        language === 'en'
          ? 'Invalid email or password. If your password was recently reset by an administrator, use "Forgot password?" below to set a new one.'
          : 'البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا قام المسؤول بإعادة تعيين كلمة المرور مؤخراً، استخدم "نسيت كلمة المرور؟" أدناه لتعيين كلمة جديدة.'
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - desktop only */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-gradient-to-b from-primary to-primary-dark p-10 text-primary-foreground">
        <div />
        <div className="space-y-6">
          <div>
            <h1 className="text-[40px] font-bold leading-tight">Qanuni</h1>
            <p className="text-xl mt-1 opacity-80">قانوني</p>
          </div>
          <p className="text-lg opacity-90 max-w-xs">
            {language === 'en'
              ? 'Manage your legal practice with confidence'
              : 'أدر ممارستك القانونية بثقة'}
          </p>
        </div>
        <div className="flex gap-8 opacity-70">
          {[
            { icon: Scale, label: language === 'en' ? 'Case Management' : 'إدارة القضايا' },
            { icon: FileText, label: language === 'en' ? 'Document Management' : 'إدارة المستندات' },
            { icon: BarChart3, label: language === 'en' ? 'Analytics & Reports' : 'التحليلات والتقارير' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-[13px]">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with back link + language */}
        <div className="flex justify-between items-center p-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {language === 'en' ? 'Back to login options' : 'العودة لخيارات تسجيل الدخول'}
          </Link>
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
          <div className="w-full max-w-[400px]">
            {/* Logo */}
            <div className="text-center mb-8">
              <h2 className="text-display-sm text-primary">Qanuni</h2>
              <p className="text-body-sm text-muted-foreground mt-1">
                {language === 'en' ? 'Law Firm Staff' : 'موظفو مكتب المحاماة'}
              </p>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h3 className="text-display-sm text-primary">{t('auth.welcomeBack')}</h3>
              <p className="text-body-md text-muted-foreground mt-2">{t('auth.enterCredentials')}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-button bg-error-light text-error text-body-md border border-error/20">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@lawfirm.com"
                  className="w-full h-11 rounded-input border border-border bg-card px-3 text-body-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-input border border-border bg-card px-3 pe-10 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember / Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-[18px] w-[18px] rounded border-border accent-accent"
                  />
                  <span className="text-body-sm text-foreground">{t('auth.rememberMe')}</span>
                </label>
                <Link to="/forgot-password" className="text-body-sm text-accent hover:underline">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-button bg-accent text-accent-foreground font-semibold text-[15px] hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-body-sm text-muted-foreground">{language === 'en' ? 'or' : 'أو'}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Sign up link */}
            <p className="text-center text-body-md text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-accent font-semibold hover:underline">
                {t('auth.signUp')}
              </Link>
            </p>

            {/* Client portal link */}
            <p className="text-center text-body-sm text-muted-foreground mt-3">
              {language === 'en' ? 'Are you a client?' : 'هل أنت عميل؟'}{' '}
              <Link to="/portal/login" className="text-accent font-medium hover:underline">
                {language === 'en' ? 'Client Portal Login' : 'دخول بوابة العملاء'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

StaffLoginPage.displayName = 'StaffLoginPage';

export default StaffLoginPage;

