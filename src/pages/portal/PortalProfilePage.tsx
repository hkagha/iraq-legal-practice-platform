import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KeyRound, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalProfilePage() {
  const { portalUser, getFullName, getInitials, refreshIdentity } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';

  const [fullName, setFullName] = useState(portalUser?.full_name || '');
  const [fullNameAr, setFullNameAr] = useState(portalUser?.full_name_ar || '');
  const [phone, setPhone] = useState(portalUser?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    setFullName(portalUser?.full_name || '');
    setFullNameAr(portalUser?.full_name_ar || '');
    setPhone(portalUser?.phone || '');
  }, [portalUser?.full_name, portalUser?.full_name_ar, portalUser?.phone]);

  async function saveProfile() {
    if (!portalUser?.id) return;
    setSavingProfile(true);
    const { error } = await supabase.from('portal_users').update({
      full_name: fullName.trim() || null,
      full_name_ar: fullNameAr.trim() || null,
      phone: phone || null,
      preferred_language: language,
    }).eq('id', portalUser.id);
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEN ? 'Profile updated' : 'تم تحديث الملف الشخصي');
    await refreshIdentity();
  }

  async function changePassword() {
    if (!newPwd || newPwd.length < 8) { toast.error(isEN ? 'Password must be at least 8 characters' : 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (newPwd !== confirmPwd) { toast.error(isEN ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين'); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEN ? 'Password updated' : 'تم تحديث كلمة المرور');
    setNewPwd(''); setConfirmPwd('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm font-bold text-primary mb-1">{isEN ? 'My Profile' : 'ملفي الشخصي'}</h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'Manage your account and password.' : 'إدارة حسابك وكلمة المرور.'}
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-accent/20 text-accent text-lg">{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-heading-md font-semibold text-primary">{getFullName()}</div>
            <div className="text-body-sm text-muted-foreground">{portalUser?.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>{isEN ? 'Full name' : 'الاسم الكامل'}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>{isEN ? 'Full name (Arabic)' : 'الاسم الكامل (عربي)'}</Label>
            <Input value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} dir="rtl" />
          </div>
          <div className="md:col-span-2">
            <Label>{isEN ? 'Phone' : 'الهاتف'}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964…" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
            {isEN ? 'Save changes' : 'حفظ التغييرات'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-accent" />
          <h3 className="text-heading-md font-semibold text-primary">{isEN ? 'Change password' : 'تغيير كلمة المرور'}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div className="md:col-span-2">
            <Label>{isEN ? 'New password' : 'كلمة المرور الجديدة'}</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="md:col-span-2">
            <Label>{isEN ? 'Confirm new password' : 'تأكيد كلمة المرور الجديدة'}</Label>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={changePassword} disabled={savingPwd || !newPwd}>
            {savingPwd ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <KeyRound className="h-4 w-4 me-2" />}
            {isEN ? 'Update password' : 'تحديث كلمة المرور'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
