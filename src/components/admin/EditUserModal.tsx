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
import { Switch } from '@/components/ui/switch';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';

const ROLES = ['super_admin', 'firm_admin', 'lawyer', 'paralegal', 'secretary', 'accountant', 'client'];

interface Props { open: boolean; userId: string; onClose: () => void; onSuccess: () => void; }

export default function EditUserModal({ open, userId, onClose, onSuccess }: Props) {
  const { language } = useLanguage();
  const { user: admin } = useAuth();
  const isEN = language === 'en';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [originalOrg, setOriginalOrg] = useState<string | null>(null);
  const [originalRole, setOriginalRole] = useState<string>('');
  const [orgs, setOrgs] = useState<{ value: string; label: string }[]>([]);
  const [resetHistory, setResetHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !userId) return;
    Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('organizations').select('id, name').order('name'),
      supabase
        .from('admin_audit_log')
        .select('id, action, created_at, admin_id, details')
        .eq('target_type', 'user')
        .eq('target_id', userId)
        .in('action', ['user_password_reset', 'user_password_changed', 'user_created'])
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(async ([{ data: profile }, { data: orgData }, { data: auditData }]) => {
      if (profile) {
        setForm(profile);
        setOriginalOrg(profile.organization_id);
        setOriginalRole(profile.role);
      }
      setOrgs((orgData || []).map((o: any) => ({ value: o.id, label: o.name })));

      const adminIds = Array.from(new Set((auditData || []).map((a: any) => a.admin_id).filter(Boolean)));
      const adminMap: Record<string, string> = {};
      if (adminIds.length) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', adminIds);
        (admins || []).forEach((a: any) => {
          adminMap[a.id] = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;
        });
      }
      setResetHistory(
        (auditData || []).map((a: any) => ({ ...a, admin_name: adminMap[a.admin_id] || (isEN ? 'Unknown' : 'غير معروف') }))
      );
      setLoading(false);
    });
  }, [open, userId, isEN]);

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: form.first_name, last_name: form.last_name,
        first_name_ar: form.first_name_ar, last_name_ar: form.last_name_ar,
        phone: form.phone, organization_id: form.organization_id, role: form.role,
        job_title: form.job_title, is_active: form.is_active,
      } as any).eq('id', userId);
      if (error) throw error;

      if (admin) {
        const name = `${form.first_name} ${form.last_name}`;
        if (form.organization_id !== originalOrg) {
          await logAdminAction(admin.id, 'user_org_changed', 'user', userId, name, { from: originalOrg, to: form.organization_id });
        } else if (form.role !== originalRole) {
          await logAdminAction(admin.id, 'user_role_changed', 'user', userId, name, { from: originalRole, to: form.role });
        } else {
          await logAdminAction(admin.id, 'user_updated', 'user', userId, name);
        }
      }
      toast.success(isEN ? 'User updated' : 'تم تحديث المستخدم');
      onClose(); onSuccess();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEN ? 'Edit User' : 'تعديل المستخدم'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'First Name' : 'الاسم الأول'}><FormInput value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} /></FormField>
            <FormField label={isEN ? 'Last Name' : 'الاسم الأخير'}><FormInput value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'First Name (Arabic)' : 'الاسم الأول (عربي)'}><FormInput value={form.first_name_ar || ''} onChange={e => set('first_name_ar', e.target.value)} dir="rtl" /></FormField>
            <FormField label={isEN ? 'Last Name (Arabic)' : 'الاسم الأخير (عربي)'}><FormInput value={form.last_name_ar || ''} onChange={e => set('last_name_ar', e.target.value)} dir="rtl" /></FormField>
          </div>
          <FormField label={isEN ? 'Phone' : 'الهاتف'}><PhoneInput value={form.phone || ''} onChange={v => set('phone', v)} /></FormField>
          <FormField label={isEN ? 'Organization' : 'المؤسسة'}>
            <FormSelect value={form.organization_id || ''} onValueChange={v => set('organization_id', v)} options={orgs} />
          </FormField>
          <FormField label={isEN ? 'Role' : 'الدور'}>
            <FormSelect value={form.role || 'lawyer'} onValueChange={v => set('role', v)} options={ROLES.map(r => ({ value: r, label: r.replace('_', ' ') }))} />
          </FormField>
          <FormField label={isEN ? 'Job Title' : 'المسمى الوظيفي'}><FormInput value={form.job_title || ''} onChange={e => set('job_title', e.target.value)} /></FormField>
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <span className="text-body-md font-medium text-foreground">{isEN ? 'Active' : 'نشط'}</span>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} />
          </div>

          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span className="text-body-md font-medium text-foreground">
                {isEN ? 'Password & Account History' : 'سجل كلمة المرور والحساب'}
              </span>
            </div>
            {form.password_set_by_admin && (
              <div className="bg-warning/10 text-warning text-body-sm rounded px-2 py-1.5">
                {isEN
                  ? 'Current password was set by an administrator. The user may need to use "Forgot password" to log in.'
                  : 'تم تعيين كلمة المرور الحالية من قبل المسؤول. قد يحتاج المستخدم إلى استخدام "نسيت كلمة المرور" لتسجيل الدخول.'}
              </div>
            )}
            {form.password_last_changed_at && (
              <p className="text-body-sm text-muted-foreground">
                {isEN ? 'Password last changed: ' : 'آخر تغيير لكلمة المرور: '}
                {new Date(form.password_last_changed_at).toLocaleString()}
              </p>
            )}
            {resetHistory.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                {isEN ? 'No recent admin actions on this account.' : 'لا توجد إجراءات إدارية حديثة.'}
              </p>
            ) : (
              <ul className="space-y-1 text-body-sm">
                {resetHistory.map((h: any) => (
                  <li key={h.id} className="flex items-start justify-between gap-3 border-t border-border pt-1.5 first:border-t-0 first:pt-0">
                    <div>
                      <span className="font-medium text-foreground capitalize">
                        {h.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground"> · {isEN ? 'by' : 'بواسطة'} {h.admin_name}</span>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 size={16} className="animate-spin me-2" />}
            {isEN ? 'Save Changes' : 'حفظ التغييرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
