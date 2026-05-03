import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/lib/adminAudit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { CitySelect } from '@/components/ui/CitySelect';
import { FormSearchSelect } from '@/components/ui/FormSearchSelect';
import { IRAQ_GOVERNORATE_LEGACY_NAMES, findGovernorate } from '@/lib/referenceData';

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
        name: form.name, name_ar: form.name_ar, phone: form.phone, email: form.email,
        website: form.website, city: form.city, governorate: form.governorate, is_active: form.is_active,
        ai_platform_disabled_by_admin: !!form.ai_platform_disabled_by_admin,
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
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-body-sm text-muted-foreground">
            {isEN
              ? 'All organizations currently receive full product access. Commercial plan controls are intentionally hidden for phase one.'
              : 'تحصل جميع المؤسسات حالياً على وصول كامل إلى المنتج. تم إخفاء أدوات الخطط التجارية عمداً في المرحلة الأولى.'}
          </div>
          <FormField label={isEN ? 'Phone' : 'الهاتف'}><PhoneInput value={form.phone || ''} onChange={v => set('phone', v)} /></FormField>
          <FormField label={isEN ? 'Email' : 'البريد'}><FormInput value={form.email || ''} onChange={e => set('email', e.target.value)} /></FormField>
          <FormField label={isEN ? 'Website' : 'الموقع'}><FormInput value={form.website || ''} onChange={e => set('website', e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={isEN ? 'Governorate' : 'المحافظة'}>
              <FormSearchSelect
                value={form.governorate || undefined}
                onChange={v => set('governorate', v)}
                options={IRAQ_GOVERNORATE_LEGACY_NAMES.map(g => ({ value: g, label: g }))}
                placeholder={isEN ? 'Select governorate' : 'اختر المحافظة'}
              />
            </FormField>
            <FormField label={isEN ? 'City' : 'المدينة'}>
              <CitySelect
                value={form.city}
                onChange={v => set('city', v)}
                governorateCode={findGovernorate(form.governorate)?.code}
              />
            </FormField>
          </div>
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <span className="text-body-md font-medium text-foreground">{isEN ? 'Active' : 'نشط'}</span>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} />
          </div>

          {/* Platform AI control */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div>
              <h4 className="text-body-md font-semibold text-foreground">
                {isEN ? 'Platform AI access' : 'الوصول إلى الذكاء الاصطناعي للمنصة'}
              </h4>
              <p className="text-body-sm text-muted-foreground mt-1">
                {isEN
                  ? 'When disabled, this organisation cannot use the platform-managed AI gateway. They must configure their own AI provider in Settings → AI to use AI features.'
                  : 'عند الإيقاف، لا يمكن لهذه المؤسسة استخدام الذكاء الاصطناعي المُدار من المنصة. يجب أن يقوموا بإعداد مزوّد الذكاء الاصطناعي الخاص بهم من الإعدادات → الذكاء الاصطناعي لاستخدام ميزات الذكاء الاصطناعي.'}
              </p>
            </div>
            <div className="flex items-center justify-between bg-background rounded-md p-3 border border-border">
              <span className="text-body-sm font-medium text-foreground">
                {form.ai_platform_disabled_by_admin
                  ? (isEN ? 'Platform AI disabled (BYOK only)' : 'الذكاء الاصطناعي للمنصة معطّل (مفتاح المؤسسة فقط)')
                  : (isEN ? 'Platform AI enabled' : 'الذكاء الاصطناعي للمنصة مفعّل')}
              </span>
              <Switch
                checked={!form.ai_platform_disabled_by_admin}
                onCheckedChange={v => set('ai_platform_disabled_by_admin', !v)}
              />
            </div>
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
