import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

export default function PortalLoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();
  const isEN = language === 'en';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'client') navigate('/portal/dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError(isEN ? 'Email is required' : 'البريد الإلكتروني مطلوب'); return; }
    if (!password) { setError(isEN ? 'Password is required' : 'كلمة المرور مطلوبة'); return; }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(isEN ? 'Invalid email or password' : 'بريد إلكتروني أو كلمة مرور غير صالحة');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-secondary via-background to-secondary/50">
      {/* Language toggle */}
      <div className="flex justify-end p-6">
        <div className="flex gap-2 text-body-md">
          <button onClick={() => setLanguage('en')} className={`px-2 pb-1 ${language === 'en' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}>EN</button>
          <button onClick={() => setLanguage('ar')} className={`px-2 pb-1 ${language === 'ar' ? 'text-accent border-b-2 border-accent font-semibold' : 'text-muted-foreground'}`}>AR</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent/10 mb-4">
              <Shield className="h-7 w-7 text-accent" />
            </div>
            <h1 className="text-display-sm text-primary">Qanuni</h1>
            <p className="text-body-md text-muted-foreground mt-1">
              {isEN ? 'Client Portal' : 'بوابة العملاء'}
            </p>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isEN ? 'Sign in to your portal' : 'تسجيل الدخول إلى بوابتك'}
            </h2>
            <p className="text-body-sm text-muted-foreground mt-1">
              {isEN ? 'Access your cases, documents, and invoices' : 'الوصول إلى قضاياك ومستنداتك وفواتيرك'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-body-sm border border-destructive/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-label text-foreground block mb-1.5">{isEN ? 'Email' : 'البريد الإلكتروني'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEN ? 'your@email.com' : 'بريدك@الإلكتروني.com'}
                className="w-full h-11 rounded-lg border border-border bg-card px-3 text-body-md placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
              />
            </div>

            <div>
              <label className="text-label text-foreground block mb-1.5">{isEN ? 'Password' : 'كلمة المرور'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-card px-3 pe-10 text-body-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-accent text-accent-foreground font-semibold text-[15px] hover:bg-accent/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? (isEN ? 'Signing in...' : 'جارٍ تسجيل الدخول...') : (isEN ? 'Sign In' : 'تسجيل الدخول')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-body-sm text-muted-foreground">
              {isEN
                ? 'Your account credentials are provided by your law firm.'
                : 'يتم توفير بيانات حسابك من قبل مكتب المحاماة الخاص بك.'}
            </p>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-body-sm text-muted-foreground">{isEN ? 'or' : 'أو'}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-body-sm text-muted-foreground">
            {isEN ? 'Are you a lawyer?' : 'هل أنت محامٍ؟'}{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              {isEN ? 'Staff Login' : 'دخول الموظفين'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
