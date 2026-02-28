import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FormField } from '@/components/ui/FormField';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface NumberRow {
  prefix: string;
  nextNumber: number;
}

export default function NumberingSettings() {
  const { language, t } = useLanguage();
  const { organization, isRole } = useAuth();
  const isAdmin = isRole('firm_admin');
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<'case' | 'errand' | 'invoice' | null>(null);
  const [form, setForm] = useState({
    case_prefix: 'CASE', case_next_number: 1,
    errand_prefix: 'ERR', errand_next_number: 1,
    invoice_prefix: 'INV', invoice_next_number: 1,
  });

  useEffect(() => {
    if (!organization?.id) return;
    supabase.from('organizations').select('*').eq('id', organization.id).single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setForm({
          case_prefix: d.case_prefix || 'CASE',
          case_next_number: d.case_next_number || 1,
          errand_prefix: d.errand_prefix || 'ERR',
          errand_next_number: d.errand_next_number || 1,
          invoice_prefix: d.invoice_prefix || 'INV',
          invoice_next_number: d.invoice_next_number || 1,
        });
      });
  }, [organization?.id]);

  const handleSave = async () => {
    if (!organization?.id) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({
      case_prefix: form.case_prefix,
      errand_prefix: form.errand_prefix,
      invoice_prefix: form.invoice_prefix,
    } as any).eq('id', organization.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.saved'));
  };

  const handleReset = async () => {
    if (!resetTarget || !organization?.id) return;
    const key = `${resetTarget}_next_number`;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({ [key]: 1 } as any).eq('id', organization.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setForm(f => ({ ...f, [key]: 1 }));
    setResetTarget(null);
    toast.success(t('settings.saved'));
  };

  const year = new Date().getFullYear();

  const rows: { labelKey: string; prefixKey: keyof typeof form; nextKey: keyof typeof form }[] = [
    { labelKey: 'settings.numbering.casePrefix', prefixKey: 'case_prefix', nextKey: 'case_next_number' },
    { labelKey: 'settings.numbering.errandPrefix', prefixKey: 'errand_prefix', nextKey: 'errand_next_number' },
    { labelKey: 'settings.numbering.invoicePrefix', prefixKey: 'invoice_prefix', nextKey: 'invoice_next_number' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-lg text-foreground">{t('settings.numbering.title')}</h2>
        <p className="text-body-md text-muted-foreground mt-1">{t('settings.numbering.subtitle')}</p>
      </div>

      {rows.map(row => {
        const prefix = form[row.prefixKey] as string;
        const next = form[row.nextKey] as number;
        const entityType = row.prefixKey.replace('_prefix', '') as 'case' | 'errand' | 'invoice';
        const preview = `${prefix}-${year}-${String(next).padStart(4, '0')}`;

        return (
          <div key={row.prefixKey} className="p-4 border border-border rounded-lg space-y-2">
            <FormField label={t(row.labelKey)}>
              <div className="flex items-center gap-2">
                <FormInput
                  value={prefix}
                  onChange={e => setForm(f => ({ ...f, [row.prefixKey]: e.target.value.toUpperCase().slice(0, 4) }))}
                  className="w-24"
                  maxLength={4}
                />
                <span className="text-body-md text-muted-foreground font-mono">-{year}-</span>
                <span className="text-body-md text-muted-foreground font-mono">{String(next).padStart(4, '0')}</span>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => setResetTarget(entityType)} className="ms-auto text-muted-foreground">
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline ms-1">{t('settings.numbering.resetCounter')}</span>
                  </Button>
                )}
              </div>
            </FormField>
            <p className="text-body-sm text-muted-foreground">
              {t('settings.numbering.preview')}: <span className="font-mono text-foreground">{preview}</span>
            </p>
          </div>
        );
      })}

      <div className="pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="h-10 bg-accent text-accent-foreground hover:bg-accent-dark">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t('settings.saveChanges')}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={handleReset}
        title="Reset Counter"
        titleAr="إعادة تعيين العداد"
        message={t('settings.numbering.resetConfirm')}
        messageAr="سيؤدي هذا إلى إعادة تعيين العداد. هل أنت متأكد؟"
        type="warning"
        isLoading={saving}
      />
    </div>
  );
}
