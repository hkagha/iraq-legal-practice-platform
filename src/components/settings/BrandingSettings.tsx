import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Upload, Trash2, Building } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandingSettings() {
  const { language, t } = useLanguage();
  const { organization } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoice_header_text: '', invoice_footer_text: '', default_terms: '',
    bank_name: '', bank_name_ar: '', bank_account_number: '', bank_iban: '', bank_swift_code: '',
  });

  useEffect(() => {
    if (!organization?.id) return;
    supabase.from('organizations').select('*').eq('id', organization.id).single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setLogoUrl(d.logo_url || null);
        setForm({
          invoice_header_text: d.invoice_header_text || d.name || '',
          invoice_footer_text: d.invoice_footer_text || '',
          default_terms: d.default_terms || '',
          bank_name: d.bank_name || '',
          bank_name_ar: d.bank_name_ar || '',
          bank_account_number: d.bank_account_number || '',
          bank_iban: d.bank_iban || '',
          bank_swift_code: d.bank_swift_code || '',
        });
      });
  }, [organization?.id]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }
    const ext = file.name.split('.').pop();
    const path = `${organization.id}/logo.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage.from('organization-assets').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('organization-assets').getPublicUrl(path);
    await supabase.from('organizations').update({ logo_url: publicUrl } as any).eq('id', organization.id);
    setLogoUrl(publicUrl + '?t=' + Date.now());
    setUploading(false);
    toast.success(t('settings.saved'));
  };

  const handleRemoveLogo = async () => {
    if (!organization?.id) return;
    await supabase.from('organizations').update({ logo_url: null } as any).eq('id', organization.id);
    setLogoUrl(null);
    toast.success(t('settings.saved'));
  };

  const handleSave = async () => {
    if (!organization?.id) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({
      invoice_header_text: form.invoice_header_text,
      invoice_footer_text: form.invoice_footer_text,
      default_terms: form.default_terms,
      bank_name: form.bank_name,
      bank_name_ar: form.bank_name_ar,
      bank_account_number: form.bank_account_number,
      bank_iban: form.bank_iban,
      bank_swift_code: form.bank_swift_code,
    } as any).eq('id', organization.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.saved'));
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-8">
      <h2 className="text-heading-lg text-foreground">{t('settings.sections.branding')}</h2>

      {/* Logo */}
      <div>
        <h3 className="text-heading-sm text-foreground mb-3">{t('settings.branding.logo')}</h3>
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] border border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted/30">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <Building size={32} />
                <span className="text-body-sm mt-1">{t('settings.branding.uploadLogo')}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleLogoUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {t('settings.branding.uploadLogo')}
            </Button>
            <p className="text-body-sm text-muted-foreground">{t('settings.branding.maxSize')}</p>
            {logoUrl && (
              <button onClick={handleRemoveLogo} className="text-body-sm text-destructive hover:underline flex items-center gap-1">
                <Trash2 size={12} /> {t('settings.branding.removeLogo')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Branding */}
      <div>
        <h3 className="text-heading-sm text-foreground mb-1">{t('settings.branding.invoiceBranding')}</h3>
        <p className="text-body-sm text-muted-foreground mb-4">
          {language === 'ar' ? 'تظهر هذه الإعدادات على فواتيرك' : 'These settings appear on your invoices'}
        </p>
        <div className="space-y-4">
          <FormField label={t('settings.branding.invoiceHeader')}>
            <FormInput value={form.invoice_header_text} onChange={e => update('invoice_header_text', e.target.value)} />
          </FormField>
          <FormField label={t('settings.branding.invoiceFooter')}>
            <FormTextarea value={form.invoice_footer_text} onChange={e => update('invoice_footer_text', e.target.value)} className="min-h-[60px]" />
          </FormField>
          <FormField label={t('settings.branding.defaultTerms')}>
            <FormTextarea value={form.default_terms} onChange={e => update('default_terms', e.target.value)} className="min-h-[100px]" />
          </FormField>
        </div>
      </div>

      {/* Bank Details */}
      <div>
        <h3 className="text-heading-sm text-foreground mb-3">{t('settings.branding.bankDetails')}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('settings.branding.bankName')}>
              <FormInput value={form.bank_name} onChange={e => update('bank_name', e.target.value)} />
            </FormField>
            <FormField label={language === 'ar' ? 'اسم البنك (إنجليزي)' : 'Bank Name (Arabic)'}>
              <FormInput value={form.bank_name_ar} onChange={e => update('bank_name_ar', e.target.value)} dir="rtl" />
            </FormField>
          </div>
          <FormField label={t('settings.branding.accountNumber')}>
            <FormInput value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value)} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('settings.branding.iban')}>
              <FormInput value={form.bank_iban} onChange={e => update('bank_iban', e.target.value)} />
            </FormField>
            <FormField label={t('settings.branding.swiftCode')}>
              <FormInput value={form.bank_swift_code} onChange={e => update('bank_swift_code', e.target.value)} />
            </FormField>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="h-10 bg-accent text-accent-foreground hover:bg-accent-dark">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );
}
