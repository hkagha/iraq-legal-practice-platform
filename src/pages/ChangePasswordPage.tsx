import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check, KeyRound, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ChangePasswordPage() {
  const { profile, refreshIdentity, signOut } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const isEN = language === 'en';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const requirements = useMemo(() => [
    { label: isEN ? 'At least 8 characters' : '٨ أحرف على الأقل', met: newPassword.length >= 8 },
    { label: isEN ? '1 uppercase letter' : 'حرف كبير واحد', met: /[A-Z]/.test(newPassword) },
    { label: isEN ? '1 number' : 'رقم واحد', met: /\d/.test(newPassword) },
    { label: isEN ? '1 special character' : 'رمز خاص واحد', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ], [isEN, newPassword]);

  if (!profile) return <Navigate to="/login/staff" replace />;
  if (!profile.password_set_by_admin) {
    return <Navigate to={profile.role === 'super_admin' || profile.role === 'sales_admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = requirements.every(req => req.met) && passwordsMatch;
  const strength = requirements.filter(req => req.met).length;
  const strengthColor = strength <= 1 ? 'bg-destructive' : strength <= 2 ? 'bg-warning' : strength <= 3 ? 'bg-accent' : 'bg-primary';

  const handleSave = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          password_set_by_admin: false,
          password_last_changed_at: new Date().toISOString(),
          password_changed_by: profile.id,
        } as any)
        .eq('id', profile.id);
      if (profileError) throw profileError;

      await refreshIdentity();
      toast({ title: isEN ? 'Password updated successfully' : 'تم تحديث كلمة المرور بنجاح' });
      navigate(profile.role === 'super_admin' || profile.role === 'sales_admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (error: any) {
      toast({
        title: isEN ? 'Could not update password' : 'تعذر تحديث كلمة المرور',
        description: error?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login/staff', { replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="mb-6 space-y-2">
          <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <h1 className="text-heading-lg text-foreground">
            {isEN ? 'Set Your Personal Password' : 'تعيين كلمة مرور شخصية'}
          </h1>
          <p className="text-body-sm text-muted-foreground">
            {isEN
              ? 'Your account was created with an administrator-set password. You can replace it here.'
              : 'تم إنشاء حسابك بكلمة مرور عيّنها المسؤول. يمكنك استبدالها هنا.'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <FormField label={isEN ? 'New password' : 'كلمة المرور الجديدة'} required>
              <FormInput
                type="password"
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            {newPassword.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(index => (
                    <div
                      key={index}
                      className={cn('h-1.5 flex-1 rounded-full transition-colors', index < strength ? strengthColor : 'bg-muted')}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {requirements.map(req => (
                    <div key={req.label} className="flex items-center gap-1.5 text-body-sm">
                      {req.met ? <Check size={12} className="text-primary" /> : <X size={12} className="text-muted-foreground" />}
                      <span className={req.met ? 'text-primary' : 'text-muted-foreground'}>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <FormField
            label={isEN ? 'Confirm new password' : 'تأكيد كلمة المرور الجديدة'}
            error={confirmPassword.length > 0 && !passwordsMatch ? (isEN ? 'Passwords do not match' : 'كلمات المرور غير متطابقة') : undefined}
            required
          >
            <FormInput
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              error={confirmPassword.length > 0 && !passwordsMatch}
            />
          </FormField>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!canSubmit || saving} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? t('common.loading') : (isEN ? 'Continue' : 'متابعة')}
            </Button>
            <Button type="button" variant="outline" onClick={handleSignOut}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
