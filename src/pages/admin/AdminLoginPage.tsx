import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Scale, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signIn, signOut, profile, portalUser, user, identityResolved } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !identityResolved) return;

    if (profile && (profile.role === 'super_admin' || profile.role === 'sales_admin')) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    // Wrong segment: reject and sign out.
    let message = language === 'en'
      ? 'This login is for platform administrators only. Please use the appropriate login window for your account.'
      : 'تسجيل الدخول هذا مخصص لمسؤولي المنصة فقط. يرجى استخدام نافذة تسجيل الدخول المناسبة لحسابك.';

    if (portalUser) {
      message = language === 'en'
        ? 'This account is registered as a client. Please use the Client Portal login.'
        : 'هذا الحساب مسجّل كعميل. يرجى استخدام تسجيل دخول بوابة العملاء.';
    } else if (profile) {
      message = language === 'en'
        ? 'This account is law firm staff. Please use the Staff login.'
        : 'هذا الحساب موظف مكتب. يرجى استخدام تسجيل دخول الموظفين.';
    }

    setError(message);
    setLoading(false);
    signOut();
  }, [user, profile, portalUser, identityResolved, navigate, signOut, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(language === 'en' ? 'Email and password are required' : 'البريد الإلكتروني وكلمة المرور مطلوبان');
      return;
    }
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(language === 'en' ? 'Invalid credentials' : 'بيانات الاعتماد غير صحيحة');
      setLoading(false);
      return;
    }
    // useEffect handles segment validation.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.5) 35px, rgba(255,255,255,0.5) 36px)'
      }} />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-card rounded-2xl shadow-2xl p-10">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-3">
              <Scale className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-heading-lg text-primary tracking-wide">QANUNI</h1>
            <p className="text-body-sm font-semibold tracking-[0.1em] text-muted-foreground uppercase mt-1">
              {language === 'en' ? 'Platform Administration' : 'إدارة المنصة'}
            </p>
            <p className="text-body-md text-muted-foreground mt-1">
              {language === 'ar' ? 'Platform Administration' : 'إدارة المنصة'}
            </p>
          </div>

          <div className="h-px bg-border my-6" />

          {/* Language toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded text-body-sm ${language === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>EN</button>
            <button onClick={() => setLanguage('ar')} className={`px-3 py-1 rounded text-body-sm ${language === 'ar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>AR</button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-body-sm border border-destructive/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-label text-foreground block mb-1.5">
                {language === 'en' ? 'Email' : 'البريد الإلكتروني'}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@qanuni.app"
                className="w-full h-11 rounded-lg border border-border bg-card px-3 text-body-md placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              />
            </div>

            <div>
              <label className="text-label text-foreground block mb-1.5">
                {language === 'en' ? 'Password' : 'كلمة المرور'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-card px-3 pe-10 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-accent text-accent-foreground font-semibold text-[15px] hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'en' ? 'Verifying...' : 'جاري التحقق...'}
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  {language === 'en' ? 'Sign In to Admin Panel' : 'تسجيل الدخول لإدارة المنصة'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-body-sm text-muted-foreground hover:text-foreground transition-colors">
              ← {language === 'en' ? 'Back to main login' : 'العودة لتسجيل الدخول الرئيسي'}
            </Link>
          </div>
        </div>

        <p className="text-center mt-6 text-body-sm text-primary-foreground/40">
          Qanuni Platform v1.0 · Secure Access
        </p>
      </div>
    </div>
  );
}
