import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/adminAudit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; }

export default function CreateOrganizationModal({ open, onClose, onSuccess }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';
  const [orgName, setOrgName] = useState('');
  const [orgNameAr, setOrgNameAr] = useState('');
  const [plan, setPlan] = useState('professional');
  const [adminEmail, setAdminEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setOrgName(''); setOrgNameAr(''); setPlan('professional'); setAdminEmail(''); setFirstName(''); setLastName(''); setPhone(''); setTempPassword(''); };

  const handleSubmit = async () => {
    if (!orgName || !adminEmail || !firstName || !lastName || !tempPassword || tempPassword.length < 8) return;
    setSaving(true);
    try {
      // 1. Create org
      const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
      const { data: org, error: orgError } = await supabase.from('organizations').insert({
        name: orgName, name_ar: orgNameAr || orgName, slug, subscription_tier: plan, subscription_status: 'active', is_active: true,
      } as any).select().single();
      if (orgError) throw orgError;

      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail, password: tempPassword,
        options: { data: { first_name: firstName, last_name: lastName, role: 'firm_admin' }, emailRedirectTo: `${window.location.origin}/login` },
      });
      if (authError) {
        // Rollback org
        await supabase.from('organizations').delete().eq('id', (org as any).id);
        throw authError;
      }

      // 3. Update profile with org
      await new Promise(r => setTimeout(r, 1500));
      await supabase.from('profiles').update({
        organization_id: (org as any).id, role: 'firm_admin', first_name: firstName, last_name: lastName, phone: phone || null,
      } as any).eq('email', adminEmail);

      // 4. Audit
      if (user) await logAdminAction(user.id, 'org_created', 'organization', (org as any).id, orgName);

      toast.success(isEN ? `Organization "${orgName}" created` : `تم إنشاء المؤسسة "${orgName}"`);
      reset(); onClose(); onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error creating organization');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader><DialogTitle>{isEN ? 'Create Organization' : 'إنشاء مؤسسة'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormField label={isEN ? 'Organization Name' : 'اسم المؤسسة'} required>
            <FormInput value={orgName} onChange={e => setOrgName(e.target.value)} />
          </FormField>
          <FormField label={isEN ? 'Organization Name (Arabic)' : 'اسم المؤسسة (عربي)'}>
            <FormInput value={orgNameAr} onChange={e => setOrgNameAr(e.target.value)} dir="rtl" />
          </FormField>
          <FormField label={isEN ? 'Plan' : 'الخطة'} required>
            <FormSelect value={plan} onValueChange={setPlan} options={[
              { value: 'starter', label: 'Starter' }, { value: 'professional', label: 'Professional' }, { value: 'enterprise', label: 'Enterprise' },
            ]} />
          </FormField>
          <div className="h-px bg-border my-2" />
          <p className="text-body-sm font-semibold text-muted-foreground">{isEN ? 'First Admin User' : 'المستخدم المسؤول الأول'}</p>
          <FormField label={isEN ? 'Admin Email' : 'البريد الإلكتروني'} required>
            <FormInput type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@firm.com" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'First Name' : 'الاسم الأول'} required>
              <FormInput value={firstName} onChange={e => setFirstName(e.target.value)} />
            </FormField>
            <FormField label={isEN ? 'Last Name' : 'الاسم الأخير'} required>
              <FormInput value={lastName} onChange={e => setLastName(e.target.value)} />
            </FormField>
          </div>
          <FormField label={isEN ? 'Phone' : 'الهاتف'}>
            <FormInput value={phone} onChange={e => setPhone(e.target.value)} />
          </FormField>
          <FormField label={isEN ? 'Temporary Password' : 'كلمة المرور المؤقتة'} required>
            <FormInput type="password" value={tempPassword} onChange={e => setTempPassword(e.target.value)} />
            <p className="text-body-sm text-muted-foreground mt-1">{isEN ? 'Min 8 characters. Share securely.' : 'الحد الأدنى 8 أحرف. شاركها بأمان.'}</p>
          </FormField>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
          <Button onClick={handleSubmit} disabled={saving || !orgName || !adminEmail || !firstName || !lastName || tempPassword.length < 8} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 size={16} className="animate-spin me-2" />}
            {isEN ? 'Create Organization' : 'إنشاء المؤسسة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
