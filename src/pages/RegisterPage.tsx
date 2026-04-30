import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Scale, FileText, BarChart3, Loader2 } from 'lucide-react';

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score; // 0-4
}

const strengthLabels = { en: ['', 'Weak', 'Fair', 'Good', 'Strong'], ar: ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية'] };
const strengthColors = ['bg-slate-200', 'bg-error', 'bg-warning', 'bg-info', 'bg-success'];

export default function RegisterPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    orgName: '', firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.orgName) { setError(t('auth.orgNameRequired')); return; }
    if (!form.firstName) { setError(t('auth.firstNameRequired')); return; }
    if (!form.lastName) { setError(t('auth.lastNameRequired')); return; }
    if (!form.email) { setError(t('auth.emailRequired')); return; }
    if (!form.phone) { setError(t('auth.phoneRequired')); return; }
    if (form.password.length < 8) { setError(t('auth.passwordMinLength')); return; }
    if (form.password !== form.confirmPassword) { setError(t('auth.passwordsDoNotMatch')); return; }

    setLoading(true);
    const result = await signUp({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: `+964${form.phone}`,
      organizationName: form.orgName,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.needsEmailConfirmation) {
      setSuccess(
        language === 'en'
          ? 'Account created. Please confirm your email address, then sign in from the Staff login page.'
          : 'تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني، ثم تسجيل الدخول من صفحة دخول الموظفين.'
      );
    } else {
      navigate('/dashboard');
    }
  };

  const inputCls = "w-full h-11 rounded-input border border-border bg-card px-3 text-body-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30";

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-gradient-to-b from-primary to-primary-dark p-10 text-primary-foreground">
        <div />
        <div className="space-y-6">
          <div>
            <h1 className="text-[40px] font-bold leading-tight">Qanuni</h1>
            <p className="text-xl mt-1 opacity-80">قانوني</p>
          </div>
          <p className="text-lg opacity-90 max-w-xs">
            {language === 'en' ? 'Manage your legal practice with confidence' : 'أدر ممارستك القانونية بثقة'}
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
        <div className="flex justify-end p-6">
          <div className="flex gap-2 text-body-md">
            <button onClick={() => setLanguage('en')} className={`px-2 pb-1 ${language === 'en' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}>EN</button>
            <button onClick={() => setLanguage('ar')} className={`px-2 pb-1 ${language === 'ar' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}>AR</button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-[440px]">
            <div className="text-center mb-6">
              <h2 className="text-display-sm text-primary">Qanuni</h2>
              <p className="text-body-sm text-muted-foreground mt-1">{language === 'en' ? 'قانوني' : 'Qanuni'}</p>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-display-sm text-primary">{t('auth.createYourAccount')}</h3>
              <p className="text-body-md text-muted-foreground mt-2">{t('auth.setupFirm')}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-button bg-error-light text-error text-body-md border border-error/20">{error}</div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-button bg-success-light text-success text-body-md border border-success/20">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.organizationName')}</label>
                <input value={form.orgName} onChange={set('orgName')} placeholder={language === 'en' ? 'e.g., Al-Rashid Law Firm' : 'مثال: مكتب الرشيد للمحاماة'} className={inputCls} />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-label text-foreground block mb-1.5">{t('auth.firstName')}</label>
                  <input value={form.firstName} onChange={set('firstName')} className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className="text-label text-foreground block mb-1.5">{t('auth.lastName')}</label>
                  <input value={form.lastName} onChange={set('lastName')} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.email')}</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="name@lawfirm.com" className={inputCls} />
              </div>

              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.phone')}</label>
                <div className="flex">
                  <span className="h-11 flex items-center px-3 rounded-s-input border border-e-0 border-border bg-secondary text-body-md text-muted-foreground">+964</span>
                  <input value={form.phone} onChange={set('phone')} placeholder="7XX XXX XXXX" className={`${inputCls} rounded-s-none`} />
                </div>
              </div>

              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`${inputCls} pe-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className="text-body-sm text-muted-foreground mt-1">{strengthLabels[language][strength]}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-label text-foreground block mb-1.5">{t('auth.confirmPassword')}</label>
                <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} className={inputCls} />
              </div>

              <button type="submit" disabled={loading} className="w-full h-11 rounded-button bg-accent text-accent-foreground font-semibold text-[15px] hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? t('auth.creatingAccount') : t('auth.register')}
              </button>
            </form>

            <p className="text-center text-body-md text-muted-foreground mt-6">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-accent font-semibold hover:underline">{t('auth.signIn')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
