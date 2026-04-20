import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Camera, User } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';

export default function MyProfileSection() {
  const { profile, organization, user, updateProfile } = useAuth();
  const { language, t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    first_name_ar: (profile as any)?.first_name_ar || '',
    last_name_ar: (profile as any)?.last_name_ar || '',
    phone: profile?.phone || '',
    whatsapp_number: (profile as any)?.whatsapp_number || '',
    bar_registration_number: (profile as any)?.bar_registration_number || '',
    job_title: profile?.job_title || '',
    bio: (profile as any)?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isLawyer = profile?.role === 'lawyer';

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form as any);
      toast({ title: t('settings.saved') });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: language === 'ar' ? 'الحد الأقصى ٢ ميجابايت' : 'Max 2MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${organization?.id}/profiles/${user?.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('organization-assets').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('organization-assets').getPublicUrl(path);
    await updateProfile({ avatar_url: urlData.publicUrl } as any);
    toast({ title: language === 'ar' ? 'تم تحديث الصورة' : 'Photo updated' });
    setUploading(false);
  };

  const handleRemoveAvatar = async () => {
    await updateProfile({ avatar_url: null } as any);
    toast({ title: language === 'ar' ? 'تم إزالة الصورة' : 'Photo removed' });
  };

  const initials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() : '';

  return (
    <div className="space-y-8">
      <h2 className="text-heading-lg text-foreground">{t('settings.sections.myProfile')}</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-heading-lg font-bold">
              {initials || <User size={32} />}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleAvatarUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera size={14} className="me-1.5" />
            {language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}
          </Button>
          {profile?.avatar_url && (
            <button onClick={handleRemoveAvatar} className="block text-body-sm text-destructive hover:underline">
              {language === 'ar' ? 'إزالة الصورة' : 'Remove Photo'}
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={language === 'ar' ? 'الاسم الأول' : 'First Name'} required>
            <FormInput value={form.first_name} onChange={handleChange('first_name')} />
          </FormField>
          <FormField label={language === 'ar' ? 'الاسم الأخير' : 'Last Name'} required>
            <FormInput value={form.last_name} onChange={handleChange('last_name')} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={language === 'ar' ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'}>
            <FormInput value={form.first_name_ar} onChange={handleChange('first_name_ar')} dir="rtl" />
          </FormField>
          <FormField label={language === 'ar' ? 'الاسم الأخير (عربي)' : 'Last Name (Arabic)'}>
            <FormInput value={form.last_name_ar} onChange={handleChange('last_name_ar')} dir="rtl" />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} helperText={language === 'ar' ? 'تواصل مع المدير لتغيير بريدك الإلكتروني' : 'Contact your administrator to change your email'}>
            <FormInput value={profile?.email || ''} disabled />
          </FormField>
          <FormField label={language === 'ar' ? 'الهاتف' : 'Phone'}>
            <PhoneInput value={form.phone} onChange={v => setForm(prev => ({ ...prev, phone: v }))} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={language === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number'}>
            <PhoneInput value={form.whatsapp_number} onChange={v => setForm(prev => ({ ...prev, whatsapp_number: v }))} />
          </FormField>
          {isLawyer && (
            <FormField label={language === 'ar' ? 'رقم نقابة المحامين' : 'Bar Number'}>
              <FormInput value={form.bar_registration_number} onChange={handleChange('bar_registration_number')} />
            </FormField>
          )}
        </div>
        <FormField label={language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}>
          <FormInput value={form.job_title} onChange={handleChange('job_title')} placeholder={language === 'ar' ? 'مثال: شريك أقدم، محامي مشارك' : 'e.g., Senior Partner, Associate Lawyer'} />
        </FormField>
        <FormField label={language === 'ar' ? 'نبذة' : 'Bio'}>
          <FormTextarea value={form.bio} onChange={handleChange('bio')} rows={3} placeholder={language === 'ar' ? 'وصف موجز عنك...' : 'Brief description about yourself...'} />
        </FormField>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
        {saving ? t('common.loading') : t('common.save')}
      </Button>
    </div>
  );
}
