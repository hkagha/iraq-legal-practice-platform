import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, KeyRound, Check, X, Loader2, Info, Wand2 } from 'lucide-react';
import { adminResetPassword, generateSecurePassword } from '@/lib/passwordService';
import { toast } from 'sonner';

interface Props {
  user: { id: string; first_name: string; last_name: string; email: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetPasswordModal({ user, onClose, onSuccess }: Props) {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLongEnough = newPassword.length >= 8;

  const handleGenerate = () => {
    const pw = generateSecurePassword();
    setNewPassword(pw);
    setShowPassword(true);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isLongEnough) return;
    setLoading(true);
    setError(null);
    const result = await adminResetPassword(user.id, newPassword);
    setLoading(false);
    if (result.success) {
      toast.success(isEN ? 'Password updated successfully' : 'تم تحديث كلمة المرور بنجاح');
      onSuccess();
    } else {
      setError(result.error || (isEN ? 'Failed to reset password' : 'فشل في إعادة تعيين كلمة المرور'));
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {isEN ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-body-sm text-muted-foreground">
            {user.first_name} {user.last_name} · {user.email}
          </p>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
            <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
            <p className="text-body-sm text-info">
              {isEN
                ? 'This will set a new password for this user. Share it with them securely. The user will see a reminder to change this password after they log in.'
                : 'سيتم تعيين كلمة مرور جديدة لهذا المستخدم. شاركها معه بشكل آمن. سيرى المستخدم تذكيراً بتغيير كلمة المرور هذه بعد تسجيل الدخول.'}
            </p>
          </div>

          <div>
            <label className="text-label text-foreground block mb-1.5">
              {isEN ? 'New Password' : 'كلمة المرور الجديدة'}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(null); }}
                placeholder={isEN ? 'Enter new password' : 'أدخل كلمة المرور الجديدة'}
                className="pe-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-body-sm">
                {isLongEnough ? <Check size={12} className="text-primary" /> : <X size={12} className="text-muted-foreground" />}
                <span className={isLongEnough ? 'text-primary' : 'text-muted-foreground'}>
                  {isEN ? 'Minimum 8 characters' : 'الحد الأدنى 8 أحرف'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-body-sm text-accent hover:underline flex items-center gap-1"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {isEN ? 'Generate Secure Password' : 'إنشاء كلمة مرور آمنة'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-body-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
          <Button onClick={handleSubmit} disabled={!isLongEnough || loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading && <Loader2 size={16} className="animate-spin me-2" />}
            {isEN ? 'Set Password' : 'تعيين كلمة المرور'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
