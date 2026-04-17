import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminCreateUser, generateSecurePassword } from '@/lib/passwordService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, Eye, EyeOff, Wand2, X, Info } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({ open, onClose, onSuccess }: Props) {
  const { t, language } = useLanguage();
  const isEN = language === 'en';
  const { organization, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('lawyer');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const isLongEnough = password.length >= 8;

  const reset = () => {
    setEmail(''); setFirstName(''); setLastName(''); setRole('lawyer');
    setPassword(''); setShowPassword(false);
    setCreatedEmail(''); setCreatedPassword(''); setCopied(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleGenerate = () => {
    setPassword(generateSecurePassword());
    setShowPassword(true);
  };

  const handleSubmit = async () => {
    if (!email || !isLongEnough || !organization?.id || !profile?.id) return;
    setSaving(true);

    const result = await adminCreateUser({
      email: email.trim(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role,
      organization_id: organization.id,
    });

    setSaving(false);

    if (!result.success) {
      toast.error(result.error || (isEN ? 'Failed to create team member' : 'فشل إنشاء عضو الفريق'));
      return;
    }

    setCreatedEmail(email.trim());
    setCreatedPassword(password);
    toast.success(isEN ? 'Team member created' : 'تم إنشاء عضو الفريق');
    onSuccess();
  };

  const handleCopy = () => {
    const text = `${isEN ? 'Email' : 'البريد'}: ${createdEmail}\n${isEN ? 'Password' : 'كلمة المرور'}: ${createdPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(isEN ? 'Credentials copied' : 'تم النسخ');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEN ? 'Add Team Member' : 'إضافة عضو فريق'}</DialogTitle>
        </DialogHeader>

        {!createdEmail ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
              <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <p className="text-body-sm text-info">
                {isEN
                  ? 'Create a staff account with a password. Share the credentials securely. The user can sign in immediately at the staff login.'
                  : 'إنشاء حساب موظف مع كلمة مرور. شارك بيانات الدخول بشكل آمن. يمكن للمستخدم تسجيل الدخول مباشرة.'}
              </p>
            </div>

            <FormField label={isEN ? 'Email' : 'البريد الإلكتروني'} required>
              <FormInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@firm.com" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={isEN ? 'First name' : 'الاسم الأول'}>
                <FormInput value={firstName} onChange={e => setFirstName(e.target.value)} />
              </FormField>
              <FormField label={isEN ? 'Last name' : 'الاسم الأخير'}>
                <FormInput value={lastName} onChange={e => setLastName(e.target.value)} />
              </FormField>
            </div>
            <FormField label={isEN ? 'Role' : 'الدور'} required>
              <FormSelect
                value={role}
                onValueChange={setRole}
                options={ROLES.map(r => ({
                  value: r,
                  label: t(`team.roles.${r}`),
                }))}
              />
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
                  {isEN ? 'Generate' : 'إنشاء'}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={saving || !email || !isLongEnough} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 size={16} className="animate-spin me-2" />}
                {isEN ? 'Create Member' : 'إنشاء العضو'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-body-md text-foreground">
              {isEN ? 'Account created. Share these credentials with the new member:' : 'تم إنشاء الحساب. شارك بيانات الدخول مع العضو الجديد:'}
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 font-mono text-body-sm">
              <div><span className="text-muted-foreground">{isEN ? 'Email' : 'البريد'}:</span> {createdEmail}</div>
              <div><span className="text-muted-foreground">{isEN ? 'Password' : 'كلمة المرور'}:</span> {createdPassword}</div>
            </div>
            <Button variant="outline" onClick={handleCopy} className="w-full">
              {copied ? <Check size={16} className="me-2 text-success" /> : <Copy size={16} className="me-2" />}
              {isEN ? 'Copy Credentials' : 'نسخ بيانات الدخول'}
            </Button>
            <DialogFooter>
              <Button onClick={handleClose}>{t('common.close')}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
