import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function PortalProfilePage() {
  const { t, language, setLanguage } = useLanguage();
  const { profile, getFullName, getInitials, updateProfile } = useAuth();

  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ phone } as any);
      toast({ title: language === 'en' ? 'Profile updated' : 'تم تحديث الملف الشخصي' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) {
      toast({ title: t('auth.passwordMinLength'), variant: 'destructive' });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: t('auth.passwordsDoNotMatch'), variant: 'destructive' });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'en' ? 'Password changed successfully' : 'تم تغيير كلمة المرور بنجاح' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
    setChangingPw(false);
  };

  if (!profile) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-display-lg font-bold text-foreground">{t('portal.profile')}</h1>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-accent/20 text-accent text-xl font-bold">{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-heading-lg font-bold text-foreground">{getFullName()}</h2>
            <p className="text-body-md text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-label text-foreground block mb-1.5">{t('common.phone')}</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+964 7XX XXX XXXX" />
          </div>

          <div>
            <label className="text-label text-foreground block mb-1.5">{language === 'en' ? 'Preferred Language' : 'اللغة المفضلة'}</label>
            <div className="flex gap-2">
              <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-md text-body-sm font-medium border ${language === 'en' ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border text-foreground'}`}>English</button>
              <button onClick={() => setLanguage('ar')} className={`px-4 py-2 rounded-md text-body-sm font-medium border ${language === 'ar' ? 'bg-accent text-accent-foreground border-accent' : 'bg-card border-border text-foreground'}`}>العربية</button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-heading-sm font-semibold text-foreground mb-4">{language === 'en' ? 'Change Password' : 'تغيير كلمة المرور'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-label text-foreground block mb-1.5">{language === 'en' ? 'New Password' : 'كلمة المرور الجديدة'}</label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-label text-foreground block mb-1.5">{t('auth.confirmPassword')}</label>
            <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </div>
          <Button variant="outline" onClick={handleChangePassword} disabled={changingPw || !newPw}>
            {changingPw && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {language === 'en' ? 'Update Password' : 'تحديث كلمة المرور'}
          </Button>
        </div>
      </div>
    </div>
  );
}
