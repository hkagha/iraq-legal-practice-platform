import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError(t('auth.emailRequired')); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <h2 className="text-display-sm text-primary">Qanuni</h2>
          <p className="text-body-sm text-muted-foreground mt-1">{language === 'en' ? 'قانوني' : 'Qanuni'}</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="text-body-lg text-foreground">{t('auth.resetSent')}</p>
            <Link to="/login" className="text-accent font-semibold hover:underline text-body-md">{t('auth.signIn')}</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-heading-lg text-foreground">{t('auth.resetPassword')}</h3>
              <p className="text-body-md text-muted-foreground mt-2">{t('auth.resetInstructions')}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-button bg-error-light text-error text-body-md border border-error/20">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button type="submit" disabled={loading} className="w-full h-11 rounded-button bg-accent text-accent-foreground font-semibold text-[15px] hover:bg-accent-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {language === 'en' ? 'Send Reset Link' : 'إرسال رابط إعادة التعيين'}
              </button>
            </form>

            <p className="text-body-sm text-muted-foreground text-center mt-4">
              {language === 'en'
                ? 'You can also contact your administrator to reset your password directly.'
                : 'يمكنك أيضاً التواصل مع المسؤول لإعادة تعيين كلمة المرور مباشرة.'}
            </p>

            <p className="text-center mt-4">
              <Link to="/login" className="text-body-md text-accent hover:underline">{t('auth.signIn')}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
