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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GOVERNORATES = ['Baghdad','Basra','Nineveh','Erbil','Sulaymaniyah','Duhok','Kirkuk','Diyala','Anbar','Babylon','Karbala','Najaf','Wasit','Maysan','Dhi Qar','Muthanna','Qadisiyyah','Saladin'];

interface Props { open: boolean; orgId: string; onClose: () => void; onSuccess: () => void; }

export default function EditOrganizationModal({ open, orgId, onClose, onSuccess }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!open || !orgId) return;
    supabase.from('organizations').select('*').eq('id', orgId).single().then(({ data }) => {
      if (data) setForm(data);
      setLoading(false);
    });
  }, [open, orgId]);

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('organizations').update({
        name: form.name, name_ar: form.name_ar, subscription_tier: form.subscription_tier,
        subscription_status: form.subscription_status, max_users: form.max_users,
        max_storage_mb: form.max_storage_mb, phone: form.phone, email: form.email,
        website: form.website, city: form.city, governorate: form.governorate, is_active: form.is_active,
      } as any).eq('id', orgId);
      if (error) throw error;
      if (user) await logAdminAction(user.id, 'org_updated', 'organization', orgId, form.name);
      toast.success(isEN ? 'Organization updated' : 'تم تحديث المؤسسة');
      onClose(); onSuccess();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEN ? 'Edit Organization' : 'تعديل المؤسسة'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormField label={isEN ? 'Name' : 'الاسم'}><FormInput value={form.name || ''} onChange={e => set('name', e.target.value)} /></FormField>
          <FormField label={isEN ? 'Name (Arabic)' : 'الاسم (عربي)'}><FormInput value={form.name_ar || ''} onChange={e => set('name_ar', e.target.value)} dir="rtl" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'Plan' : 'الخطة'}>
              <FormSelect value={form.subscription_tier || 'starter'} onValueChange={v => set('subscription_tier', v)} options={[
                { value: 'starter', label: 'Starter' }, { value: 'professional', label: 'Professional' }, { value: 'enterprise', label: 'Enterprise' },
              ]} />
            </FormField>
            <FormField label={isEN ? 'Subscription Status' : 'حالة الاشتراك'}>
              <FormSelect value={form.subscription_status || 'active'} onValueChange={v => set('subscription_status', v)} options={[
                { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' }, { value: 'past_due', label: 'Past Due' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'suspended', label: 'Suspended' },
              ]} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'Max Users' : 'الحد الأقصى للمستخدمين'}><FormInput type="number" value={form.max_users || 10} onChange={e => set('max_users', parseInt(e.target.value))} /></FormField>
            <FormField label={isEN ? 'Max Storage (MB)' : 'أقصى تخزين (ميغابايت)'}><FormInput type="number" value={form.max_storage_mb || 1024} onChange={e => set('max_storage_mb', parseInt(e.target.value))} /></FormField>
          </div>
          <FormField label={isEN ? 'Phone' : 'الهاتف'}><FormInput value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></FormField>
          <FormField label={isEN ? 'Email' : 'البريد'}><FormInput value={form.email || ''} onChange={e => set('email', e.target.value)} /></FormField>
          <FormField label={isEN ? 'Website' : 'الموقع'}><FormInput value={form.website || ''} onChange={e => set('website', e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'City' : 'المدينة'}><FormInput value={form.city || ''} onChange={e => set('city', e.target.value)} /></FormField>
            <FormField label={isEN ? 'Governorate' : 'المحافظة'}>
              <FormSelect value={form.governorate || ''} onValueChange={v => set('governorate', v)} options={GOVERNORATES.map(g => ({ value: g, label: g }))} />
            </FormField>
          </div>
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <span className="text-body-md font-medium text-foreground">{isEN ? 'Active' : 'نشط'}</span>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} />
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
