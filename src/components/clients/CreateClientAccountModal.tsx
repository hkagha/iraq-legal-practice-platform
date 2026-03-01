import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2, Wand2, Check, X, Info } from 'lucide-react';
import { generateSecurePassword } from '@/lib/passwordService';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  defaultEmail: string;
  clientName: string;
}

export default function CreateClientAccountModal({ open, onClose, onSuccess, clientId, defaultEmail, clientName }: Props) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const isEN = language === 'en';

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setPassword('');
      setShowPassword(false);
    }
  }, [open, defaultEmail]);

  const isLongEnough = password.length >= 8;

  const handleGenerate = () => {
    setPassword(generateSecurePassword());
    setShowPassword(true);
  };

  const handleSubmit = async () => {
    if (!email || !isLongEnough || !profile?.organization_id) return;
    setSaving(true);
    try {
      // Create auth user with client role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: clientName, last_name: '', role: 'client' },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (authError) throw authError;

      // Wait for profile trigger
      await new Promise(r => setTimeout(r, 1500));

      // Update profile with org and role
      await supabase.from('profiles').update({
        organization_id: profile.organization_id,
        role: 'client',
        first_name: clientName,
        password_set_by_admin: true,
        password_last_changed_at: new Date().toISOString(),
        password_changed_by: profile.id,
      } as any).eq('email', email);

      // Create client_user_link
      if (authData.user?.id) {
        await supabase.from('client_user_links').insert({
          user_id: authData.user.id,
          client_id: clientId,
          organization_id: profile.organization_id,
        } as any);
      }

      toast.success(isEN ? `Portal account created for "${email}"` : `تم إنشاء حساب البوابة لـ "${email}"`);
      onClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || (isEN ? 'Error creating account' : 'خطأ في إنشاء الحساب'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEN ? 'Create Portal Account' : 'إنشاء حساب البوابة'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-body-sm text-muted-foreground">{clientName}</p>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
            <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
            <p className="text-body-sm text-info">
              {isEN
                ? 'This will create a portal login for this client. Share the credentials with them securely. No invitation email will be sent.'
                : 'سيتم إنشاء حساب دخول للبوابة لهذا العميل. شارك بيانات الدخول معه بشكل آمن. لن يتم إرسال بريد إلكتروني.'}
            </p>
          </div>

          <FormField label={isEN ? 'Email' : 'البريد الإلكتروني'} required>
            <FormInput type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </FormField>

          <div>
            <label className="text-label text-foreground block mb-1.5">
              {isEN ? 'Password' : 'كلمة المرور'}
            </label>
            <div className="relative">
              <FormInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isEN ? 'Minimum 8 characters' : 'الحد الأدنى 8 أحرف'}
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
              <button type="button" onClick={handleGenerate} className="text-body-sm text-accent hover:underline flex items-center gap-1">
                <Wand2 className="h-3.5 w-3.5" />
                {isEN ? 'Generate Password' : 'إنشاء كلمة مرور'}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !email || !isLongEnough}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving && <Loader2 size={16} className="animate-spin me-2" />}
            {isEN ? 'Create Account' : 'إنشاء الحساب'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
