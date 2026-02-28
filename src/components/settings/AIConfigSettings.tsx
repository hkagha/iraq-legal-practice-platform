import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FormInput } from '@/components/ui/FormInput';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Save, Loader2 } from 'lucide-react';

export default function AIConfigSettings() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(500000);
  const [tokensUsed, setTokensUsed] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) return;
    (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('ai_enabled, ai_monthly_token_limit, ai_tokens_used_this_month')
        .eq('id', profile.organization_id!)
        .maybeSingle();
      if (data) {
        setAiEnabled((data as any).ai_enabled ?? false);
        setMonthlyLimit((data as any).ai_monthly_token_limit ?? 500000);
        setTokensUsed((data as any).ai_tokens_used_this_month ?? 0);
      }
      setLoading(false);
    })();
  }, [profile?.organization_id]);

  const handleSave = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          ai_enabled: aiEnabled,
          ai_monthly_token_limit: monthlyLimit,
        } as any)
        .eq('id', profile.organization_id!);
      if (error) throw error;
      toast({ title: language === 'ar' ? 'تم حفظ إعدادات الذكاء الاصطناعي' : 'AI settings saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-20 bg-muted rounded" /></div>;

  const usagePercent = monthlyLimit > 0 ? Math.min(100, Math.round((tokensUsed / monthlyLimit) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-md font-bold text-foreground flex items-center gap-2">
          <Sparkles size={20} className="text-accent" />
          {t('ai.settings.title')}
        </h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          {language === 'ar' ? 'إدارة ميزات الذكاء الاصطناعي لمؤسستك' : 'Manage AI features for your organization'}
        </p>
      </div>

      {/* AI Enabled */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">{t('ai.settings.enabled')}</h3>
            <p className="text-body-sm text-muted-foreground">
              {language === 'ar' ? 'تفعيل ميزات الذكاء الاصطناعي عبر المنصة' : 'Enable AI-powered features across the platform'}
            </p>
          </div>
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
        </div>
      </div>

      {aiEnabled && (
        <>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-body-sm text-foreground">
            <Sparkles size={16} className="inline me-2 text-accent" />
            {language === 'ar'
              ? 'ميزات الذكاء الاصطناعي مدعومة بواسطة Lovable Cloud. لا حاجة لإعداد مفتاح API.'
              : 'AI features are powered by Lovable Cloud. No API key setup needed.'}
          </div>

          <FormField label={t('ai.settings.monthlyLimit')}>
            <FormInput
              type="number"
              value={monthlyLimit}
              onChange={e => setMonthlyLimit(parseInt(e.target.value) || 0)}
              min={10000}
              step={10000}
            />
          </FormField>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-body-md font-semibold text-foreground mb-3">{t('ai.settings.usageThisMonth')}</h3>
            <Progress value={usagePercent} className="h-3 mb-2" />
            <p className="text-body-sm text-muted-foreground">
              {t('ai.settings.tokensUsed').replace('{{used}}', tokensUsed.toLocaleString()).replace('{{limit}}', monthlyLimit.toLocaleString())}
            </p>
            <p className="text-body-sm text-muted-foreground mt-1">{t('ai.settings.resetDate')}</p>
          </div>
        </>
      )}

      <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
        {saving ? <Loader2 size={16} className="me-2 animate-spin" /> : <Save size={16} className="me-2" />}
        {t('common.save')}
      </Button>
    </div>
  );
}
