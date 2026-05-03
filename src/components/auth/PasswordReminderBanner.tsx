import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PasswordReminderBanner() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEN = language === 'en';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('qanuni_password_reminder_dismissed') === 'true';
    setVisible(Boolean(profile?.password_set_by_admin) && !dismissed);
  }, [profile?.password_set_by_admin]);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem('qanuni_password_reminder_dismissed', 'true');
    setVisible(false);
  };

  return (
    <div className="bg-muted/60 border-b border-border px-4 py-2 flex items-center justify-center gap-3 text-body-sm">
      <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">
        {isEN
          ? 'Your password was set by an administrator. You can change it when convenient.'
          : 'تم تعيين كلمة مرورك بواسطة المسؤول. يمكنك تغييرها في الوقت المناسب.'}
      </span>
      <button
        type="button"
        onClick={() => navigate('/change-password')}
        className="font-medium text-accent hover:underline whitespace-nowrap"
      >
        {isEN ? 'Change password' : 'تغيير كلمة المرور'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground/70 hover:text-foreground"
        aria-label={isEN ? 'Dismiss reminder' : 'إخفاء التذكير'}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
