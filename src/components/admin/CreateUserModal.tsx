import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/adminAudit';
import { adminCreateUser } from '@/lib/passwordService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';

const ROLES = ['firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedOrgId?: string;
  preselectedPersonId?: string;
  defaultRole?: string;
}

export default function CreateUserModal({ open, onClose, onSuccess, preselectedOrgId, preselectedPersonId, defaultRole = 'lawyer' }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [orgId, setOrgId] = useState(preselectedOrgId || '');
  const [role, setRole] = useState(defaultRole);
  const [password, setPassword] = useState('');
  const [personId, setPersonId] = useState(preselectedPersonId || '');
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<{ value: string; label: string }[]>([]);
  const [people, setPeople] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;

    supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setOrgs((data || []).map((o: any) => ({ value: o.id, label: o.name })));
      });

    if (preselectedOrgId) setOrgId(preselectedOrgId);
    if (defaultRole) setRole(defaultRole);
    if (preselectedPersonId) setPersonId(preselectedPersonId);
  }, [open, preselectedOrgId, preselectedPersonId, defaultRole]);

  useEffect(() => {
    if (!open || !orgId) {
      setPeople([]);
      return;
    }

    supabase
      .from('persons')
      .select('id, first_name, first_name_ar, last_name, last_name_ar')
      .eq('organization_id', orgId)
      .order('first_name')
      .then(({ data }) => {
        setPeople(
          (data || []).map((person: any) => {
            const englishName = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
            const arabicName = [person.first_name_ar || person.first_name, person.last_name_ar || person.last_name].filter(Boolean).join(' ').trim();

            return {
              value: person.id,
              label: language === 'ar' ? arabicName || englishName : englishName || arabicName,
            };
          }),
        );
      });
  }, [open, orgId, language]);

  const reset = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setOrgId(preselectedOrgId || '');
    setRole(defaultRole);
    setPassword('');
    setPersonId(preselectedPersonId || '');
  };

  const isClientRole = role === 'client';
  const isSubmitDisabled =
    saving ||
    !email ||
    !firstName ||
    !lastName ||
    !orgId ||
    password.length < 8 ||
    (isClientRole && !personId);

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;

    setSaving(true);
    try {
      const result = await adminCreateUser({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
        organization_id: orgId,
        phone: phone || undefined,
        person_id: isClientRole ? personId : undefined,
      });

      if (!result.success) throw new Error(result.error || 'Failed to create user');

      if (user) {
        await logAdminAction(user.id, 'user_created', 'user', result.user_id || null, email, {
          role,
          organization_id: orgId,
          person_id: isClientRole ? personId : null,
        });
      }

      toast.success(isEN ? `User "${email}" created` : `تم إنشاء المستخدم "${email}"`);
      reset();
      onClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error creating user');
    } finally {
      setSaving(false);
    }
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
            <PhoneInput value={phone} onChange={setPhone} />
          </FormField>
          <FormField label={isEN ? 'Organization' : 'المؤسسة'} required>
            <FormSelect value={orgId} onValueChange={value => { setOrgId(value); setPersonId(''); }} options={orgs} placeholder={isEN ? 'Select organization...' : 'اختر المؤسسة...'} />
          </FormField>
          <FormField label={isEN ? 'Role' : 'الدور'} required>
            <FormSelect value={role} onValueChange={value => { setRole(value); if (value !== 'client') setPersonId(''); }} options={ROLES.map(r => ({ value: r, label: r.replace('_', ' ') }))} />
          </FormField>
          {isClientRole && (
            <FormField
              label={isEN ? 'Linked Individual Client' : 'العميل الفرد المرتبط'}
              required
              helperText={
                isEN
                  ? 'Select the person record for this login. If this person represents a company client, they will inherit access to that company in the portal.'
                  : 'اختر سجل الشخص لهذا الحساب. إذا كان هذا الشخص ممثلاً لشركة عميلة، فسيحصل تلقائياً على صلاحية الوصول إلى تلك الشركة في البوابة.'
              }
            >
              <FormSelect
                value={personId}
                onValueChange={setPersonId}
                options={people}
                placeholder={
                  people.length > 0
                    ? isEN ? 'Select individual client...' : 'اختر العميل الفرد...'
                    : isEN ? 'No people found in this organization' : 'لا يوجد أفراد في هذه المؤسسة'
                }
              />
            </FormField>
          )}
          <FormField label={isEN ? 'Temporary Password' : 'كلمة المرور المؤقتة'} required>
            <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 size={16} className="animate-spin me-2" />}
            {isEN ? 'Create User' : 'إنشاء المستخدم'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
