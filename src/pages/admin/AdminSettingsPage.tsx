import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HelpButton } from '@/components/ui/HelpButton';

export default function AdminSettingsPage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const isEN = language === 'en';

  const [planLimits, setPlanLimits] = useState({
    free: { maxMembers: 3, maxStorage: 1000, maxCases: 10, aiEnabled: false, portalEnabled: false },
    professional: { maxMembers: 15, maxStorage: 10000, maxCases: 9999, aiEnabled: false, portalEnabled: true },
    enterprise: { maxMembers: 999, maxStorage: 100000, maxCases: 9999, aiEnabled: true, portalEnabled: true },
  });

  const [branding, setBranding] = useState({
    platformName: 'Qanuni',
    supportEmail: 'support@qanuni.app',
    supportPhone: '',
    termsUrl: '',
    privacyUrl: '',
  });

  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data } = await supabase.from('platform_settings').select('key, value') as any;
    if (data) {
      data.forEach((row: any) => {
        if (row.key === 'plan_limits') setPlanLimits(row.value);
        if (row.key === 'branding') setBranding(row.value);
        if (row.key === 'maintenance') {
          setMaintenance(row.value.enabled);
          setMaintenanceMsg(row.value.message || '');
        }
      });
    }
    setLoadingSettings(false);
  }

  async function savePlanLimits() {
    await supabase.from('platform_settings').upsert(
      { key: 'plan_limits', value: planLimits as any, updated_at: new Date().toISOString(), updated_by: profile?.id } as any,
      { onConflict: 'key' }
    );
    toast.success(isEN ? 'Plan limits saved' : 'تم حفظ حدود الخطط');
  }

  async function saveBranding() {
    await supabase.from('platform_settings').upsert(
      { key: 'branding', value: branding as any, updated_at: new Date().toISOString(), updated_by: profile?.id } as any,
      { onConflict: 'key' }
    );
    toast.success(isEN ? 'Branding settings saved' : 'تم حفظ إعدادات الهوية');
  }

  async function toggleMaintenance() {
    const newVal = !maintenance;
    setMaintenance(newVal);
    await supabase.from('platform_settings').upsert(
      { key: 'maintenance', value: { enabled: newVal, message: maintenanceMsg } as any, updated_at: new Date().toISOString(), updated_by: profile?.id } as any,
      { onConflict: 'key' }
    );
    toast.success(isEN ? (newVal ? 'Maintenance mode activated' : 'Maintenance mode deactivated') : (newVal ? 'تم تفعيل وضع الصيانة' : 'تم إلغاء وضع الصيانة'));
  }

  if (loadingSettings) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <h1 className="text-display-sm text-foreground">{isEN ? 'Platform Settings' : 'إعدادات المنصة'}</h1>
        <HelpButton helpKey="admin.settings" />
      </div>

      {/* Plan Limits */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-heading-lg text-foreground mb-4">{isEN ? 'Default Plan Limits' : 'حدود الخطط الافتراضية'}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start p-3 font-medium text-muted-foreground">{isEN ? 'Setting' : 'الإعداد'}</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Free</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Professional</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 text-foreground">{isEN ? 'Max Members' : 'أقصى أعضاء'}</td>
                {(['free', 'professional', 'enterprise'] as const).map(plan => (
                  <td key={plan} className="p-3 text-center">
                    <input type="number" value={planLimits[plan].maxMembers} onChange={e => setPlanLimits(prev => ({ ...prev, [plan]: { ...prev[plan], maxMembers: +e.target.value } }))} className="w-20 h-8 text-center rounded border border-border bg-card text-body-sm" />
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 text-foreground">{isEN ? 'Max Cases' : 'أقصى قضايا'}</td>
                {(['free', 'professional', 'enterprise'] as const).map(plan => (
                  <td key={plan} className="p-3 text-center">
                    <input type="number" value={planLimits[plan].maxCases} onChange={e => setPlanLimits(prev => ({ ...prev, [plan]: { ...prev[plan], maxCases: +e.target.value } }))} className="w-20 h-8 text-center rounded border border-border bg-card text-body-sm" />
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 text-foreground">{isEN ? 'AI Enabled' : 'الذكاء الاصطناعي'}</td>
                {(['free', 'professional', 'enterprise'] as const).map(plan => (
                  <td key={plan} className="p-3 text-center">
                    <input type="checkbox" checked={planLimits[plan].aiEnabled} onChange={e => setPlanLimits(prev => ({ ...prev, [plan]: { ...prev[plan], aiEnabled: e.target.checked } }))} className="h-4 w-4 accent-accent" />
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 text-foreground">{isEN ? 'Client Portal' : 'بوابة العملاء'}</td>
                {(['free', 'professional', 'enterprise'] as const).map(plan => (
                  <td key={plan} className="p-3 text-center">
                    <input type="checkbox" checked={planLimits[plan].portalEnabled} onChange={e => setPlanLimits(prev => ({ ...prev, [plan]: { ...prev[plan], portalEnabled: e.target.checked } }))} className="h-4 w-4 accent-accent" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={savePlanLimits} className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-body-md font-medium hover:bg-accent/90">{isEN ? 'Save Limits' : 'حفظ الحدود'}</button>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-heading-lg text-foreground mb-4">{isEN ? 'Platform Branding' : 'هوية المنصة'}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {([
            { key: 'platformName', label: isEN ? 'Platform Name' : 'اسم المنصة' },
            { key: 'supportEmail', label: isEN ? 'Support Email' : 'بريد الدعم' },
            { key: 'supportPhone', label: isEN ? 'Support Phone' : 'هاتف الدعم' },
            { key: 'termsUrl', label: isEN ? 'Terms of Service URL' : 'رابط شروط الخدمة' },
            { key: 'privacyUrl', label: isEN ? 'Privacy Policy URL' : 'رابط سياسة الخصوصية' },
          ] as const).map(f => (
            <div key={f.key}>
              <label className="text-label text-foreground block mb-1">{f.label}</label>
              <input value={(branding as any)[f.key]} onChange={e => setBranding(prev => ({ ...prev, [f.key]: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-card px-3 text-body-md" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveBranding} className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-body-md font-medium hover:bg-accent/90">{isEN ? 'Save Branding' : 'حفظ الهوية'}</button>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-heading-lg text-foreground mb-4">{isEN ? 'Maintenance Mode' : 'وضع الصيانة'}</h2>
        <div className="flex items-center gap-3 mb-4">
          <input type="checkbox" checked={maintenance} onChange={toggleMaintenance} className="h-5 w-5 accent-accent" />
          <span className="text-body-md text-foreground">{isEN ? 'Enable Maintenance Mode' : 'تفعيل وضع الصيانة'}</span>
        </div>
        {maintenance && (
          <div>
            <label className="text-label text-foreground block mb-1">{isEN ? 'Maintenance Message' : 'رسالة الصيانة'}</label>
            <textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-body-md" placeholder={isEN ? 'We are performing scheduled maintenance...' : 'نقوم بإجراء صيانة مجدولة...'} />
          </div>
        )}
      </div>
    </div>
  );
}
