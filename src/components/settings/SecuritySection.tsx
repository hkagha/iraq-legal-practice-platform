import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { Lock, Check, X, Shield, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function SecuritySection() {
  const { language, t } = useLanguage();
  const { profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const requirements = useMemo(() => [
    { label: language === 'ar' ? '٨ أحرف على الأقل' : 'At least 8 characters', met: newPassword.length >= 8 },
    { label: language === 'ar' ? 'حرف كبير واحد' : '1 uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: language === 'ar' ? 'رقم واحد' : '1 number', met: /\d/.test(newPassword) },
    { label: language === 'ar' ? 'رمز خاص واحد' : '1 special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ], [newPassword, language]);

  const strength = requirements.filter(r => r.met).length;
  const strengthColor = strength <= 1 ? 'bg-destructive' : strength <= 2 ? 'bg-warning' : strength <= 3 ? 'bg-accent' : 'bg-primary';
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = requirements.every(r => r.met) && passwordsMatch && currentPassword.length > 0;

  const handleUpdatePassword = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
    } else {
      // Clear admin-set flag
      if (profile?.id) {
        await supabase.from('profiles').update({
          password_set_by_admin: false,
          password_last_changed_at: new Date().toISOString(),
          password_changed_by: profile.id,
        } as any).eq('id', profile.id);
      }
      sessionStorage.setItem('qanuni_password_reminder_dismissed', 'true');
      toast({ title: language === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-heading-lg text-foreground">{language === 'ar' ? 'الأمان' : 'Security'}</h2>

      {/* Change Password */}
      <div className="space-y-4">
        <h3 className="text-heading-md text-foreground flex items-center gap-2">
          <Lock size={18} />
          {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
        </h3>

        <FormField label={language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'} required>
          <FormInput type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </FormField>

        <div>
          <FormField label={language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'} required>
            <FormInput type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </FormField>
          {newPassword.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < strength ? strengthColor : 'bg-muted')} />
                ))}
              </div>
              <div className="space-y-1">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-body-sm">
                    {req.met ? <Check size={12} className="text-primary" /> : <X size={12} className="text-muted-foreground" />}
                    <span className={req.met ? 'text-primary' : 'text-muted-foreground'}>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <FormField label={language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'} required>
            <FormInput type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </FormField>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-body-sm text-destructive mt-1">{language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}</p>
          )}
        </div>

        <Button onClick={handleUpdatePassword} disabled={!canSubmit || saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {saving ? t('common.loading') : (language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
        </Button>
      </div>

      {/* Active Sessions */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-heading-md text-foreground flex items-center gap-2">
          <Monitor size={18} />
          {language === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
        </h3>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-3">
            <Monitor size={20} className="text-muted-foreground" />
            <div className="flex-1">
              <p className="text-body-md font-medium text-foreground">{language === 'ar' ? 'الجلسة الحالية' : 'Current session'}</p>
              <p className="text-body-sm text-muted-foreground">{navigator.userAgent.split('(')[1]?.split(')')[0] || 'Browser'}</p>
            </div>
            <span className="text-body-sm text-primary font-medium">{language === 'ar' ? 'نشطة الآن' : 'Active now'}</span>
          </div>
        </div>
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => toast({ title: language === 'ar' ? 'تواصل مع الدعم لإلغاء الجلسات الأخرى' : 'Contact support to revoke other sessions' })}>
          {language === 'ar' ? 'تسجيل الخروج من الجلسات الأخرى' : 'Sign out all other sessions'}
        </Button>
      </div>

      {/* 2FA Placeholder */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-heading-md text-foreground flex items-center gap-2">
          <Shield size={18} />
          {language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}
        </h3>
        <p className="text-body-md text-muted-foreground">{language === 'ar' ? 'أضف طبقة أمان إضافية لحسابك' : 'Add an extra layer of security to your account'}</p>
        <div className="flex items-center gap-3">
          <span className="text-body-sm text-muted-foreground">{language === 'ar' ? 'الحالة: غير مفعلة' : 'Status: Not enabled'}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled>
                {language === 'ar' ? 'تفعيل المصادقة الثنائية' : 'Enable 2FA'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === 'ar' ? 'قريباً' : 'Coming soon'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
