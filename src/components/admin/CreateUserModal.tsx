import { useState, useEffect } from 'react';
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

const ROLES = ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'];

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; preselectedOrgId?: string; }

export default function CreateUserModal({ open, onClose, onSuccess, preselectedOrgId }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [orgId, setOrgId] = useState(preselectedOrgId || '');
  const [role, setRole] = useState('lawyer');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from('organizations').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      setOrgs((data || []).map((o: any) => ({ value: o.id, label: o.name })));
    });
    if (preselectedOrgId) setOrgId(preselectedOrgId);
  }, [open, preselectedOrgId]);

  const reset = () => { setEmail(''); setFirstName(''); setLastName(''); setPhone(''); setOrgId(preselectedOrgId || ''); setRole('lawyer'); setPassword(''); };

  const handleSubmit = async () => {
    if (!email || !firstName || !lastName || !orgId || !password || password.length < 8) return;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password,
        options: { data: { first_name: firstName, last_name: lastName, role }, emailRedirectTo: `${window.location.origin}/login` },
      });
      if (authError) throw authError;

      await new Promise(r => setTimeout(r, 1500));
      await supabase.from('profiles').update({
        organization_id: orgId, role, first_name: firstName, last_name: lastName, phone: phone || null,
      } as any).eq('email', email);

      // Mark password as admin-set
      if (authData.user?.id) {
        await supabase.from('profiles').update({
          password_set_by_admin: true,
          password_last_changed_at: new Date().toISOString(),
          password_changed_by: user?.id || null,
        } as any).eq('id', authData.user.id);
      }

      if (user) await logAdminAction(user.id, 'user_created', 'user', authData.user?.id || null, email);
      toast.success(isEN ? `User "${email}" created` : `تم إنشاء المستخدم "${email}"`);
      reset(); onClose(); onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error creating user');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader><DialogTitle>{isEN ? 'Create User' : 'إنشاء مستخدم'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormField label={isEN ? 'Email' : 'البريد الإلكتروني'} required>
            <FormInput type="email" value={email} onChange={e => setEmail(e.target.value)} />
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
          <FormField label={isEN ? 'Organization' : 'المؤسسة'} required>
            <FormSelect value={orgId} onValueChange={setOrgId} options={orgs} placeholder={isEN ? 'Select organization...' : 'اختر المؤسسة...'} />
          </FormField>
          <FormField label={isEN ? 'Role' : 'الدور'} required>
            <FormSelect value={role} onValueChange={setRole} options={ROLES.map(r => ({ value: r, label: r.replace('_', ' ') }))} />
          </FormField>
          <FormField label={isEN ? 'Temporary Password' : 'كلمة المرور المؤقتة'} required>
            <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
          <Button onClick={handleSubmit} disabled={saving || !email || !firstName || !lastName || !orgId || password.length < 8} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 size={16} className="animate-spin me-2" />}
            {isEN ? 'Create User' : 'إنشاء المستخدم'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
