import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SlideOver } from '@/components/ui/SlideOver';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormField } from '@/components/ui/FormField';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface BillingRatesSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BillingRatesSlideOver({ isOpen, onClose }: BillingRatesSlideOverProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  const [defaultRate, setDefaultRate] = useState('');
  const [defaultRateId, setDefaultRateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !profile?.organization_id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('billing_rates')
        .select('id, rate')
        .eq('organization_id', profile.organization_id!)
        .eq('is_default', true)
        .is('user_id', null)
        .is('case_id', null)
        .maybeSingle();
      if (data) {
        setDefaultRateId(data.id);
        setDefaultRate(String(data.rate));
      } else {
        setDefaultRateId(null);
        setDefaultRate('');
      }
    };
    fetch();
  }, [isOpen, profile?.organization_id]);

  const saveDefaultRate = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      const rate = parseFloat(defaultRate);
      if (isNaN(rate) || rate <= 0) {
        toast.error(t('Please enter a valid rate', 'أدخل سعراً صالحاً'));
        return;
      }
      if (defaultRateId) {
        await supabase.from('billing_rates').update({ rate } as any).eq('id', defaultRateId);
      } else {
        await supabase.from('billing_rates').insert({
          organization_id: profile.organization_id,
          rate,
          is_default: true,
          currency: 'IQD',
        } as any);
      }
      toast.success(t('Default rate saved', 'تم حفظ السعر الافتراضي'));
    } catch {
      toast.error(t('Failed to save', 'فشل الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Billing Rates"
      titleAr="أسعار الفوترة"
      width="md"
    >
      <div className="space-y-6">
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <h3 className="text-heading-sm font-semibold text-foreground mb-3">
            {t('Default Organization Rate', 'السعر الافتراضي للمنظمة')}
          </h3>
          <div className="flex items-end gap-3">
            <FormField label={t('Rate per hour (IQD)', 'سعر الساعة (د.ع)')}>
              <FormInput
                type="number"
                value={defaultRate}
                onChange={e => setDefaultRate(e.target.value)}
                placeholder="50000"
              />
            </FormField>
            <Button onClick={saveDefaultRate} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 h-10">
              {saving ? <Loader2 size={14} className="animate-spin me-1" /> : <Save size={14} className="me-1" />}
              {t('Save', 'حفظ')}
            </Button>
          </div>
          <p className="text-body-sm text-muted-foreground mt-2">
            {t('This rate will be used as fallback when no specific user or case rate is set.', 'سيُستخدم هذا السعر كاحتياطي عند عدم تعيين سعر محدد للمستخدم أو القضية.')}
          </p>
        </div>
      </div>
    </SlideOver>
  );
}
