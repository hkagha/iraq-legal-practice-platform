import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FormInput } from '@/components/ui/FormInput';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Save, Loader2, KeyRound, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import AIUsageDashboard from '@/components/settings/AIUsageDashboard';

type Provider = 'lovable' | 'openai' | 'anthropic' | 'google' | 'custom';

const PROVIDER_OPTIONS: { value: Provider; label: string; labelAr: string }[] = [
  { value: 'lovable', label: 'Platform AI (Lovable)', labelAr: 'الذكاء الاصطناعي للمنصة' },
  { value: 'openai', label: 'OpenAI (GPT)', labelAr: 'OpenAI (GPT)' },
  { value: 'anthropic', label: 'Anthropic (Claude)', labelAr: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google Gemini', labelAr: 'Google Gemini' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)', labelAr: 'مخصص (متوافق مع OpenAI)' },
];

const CURATED_MODELS: Record<Provider, { value: string; label: string }[]> = {
  lovable: [],
  openai: [
    { value: 'gpt-5', label: 'gpt-5' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini' },
    { value: 'gpt-5-nano', label: 'gpt-5-nano' },
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'claude-sonnet-4-5' },
    { value: 'claude-opus-4-1-20250805', label: 'claude-opus-4-1' },
    { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5' },
  ],
  google: [
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
  ],
  custom: [],
};

export default function AIConfigSettings() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(500000);
  const [tokensUsed, setTokensUsed] = useState(0);

  // BYOK
  const [provider, setProvider] = useState<Provider>('lovable');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState(''); // write-only
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [fallback, setFallback] = useState(true);
  const [useCustomModel, setUseCustomModel] = useState(false);

  const isAdmin = profile?.role === 'firm_admin';
  const isBYOK = provider !== 'lovable';

  useEffect(() => {
    if (!profile?.organization_id) return;
    (async () => {
      const orgId = profile.organization_id!;
      const [orgRes, hasKeyRes] = await Promise.all([
        supabase.from('organizations')
          .select('ai_enabled, ai_monthly_token_limit, ai_tokens_used_this_month, ai_provider, ai_model, ai_base_url, ai_fallback_to_platform')
          .eq('id', orgId).maybeSingle(),
        supabase.rpc('org_has_ai_key' as any, { _org_id: orgId }),
      ]);
      const data: any = orgRes.data;
      if (data) {
        setAiEnabled(data.ai_enabled ?? false);
        setMonthlyLimit(data.ai_monthly_token_limit ?? 500000);
        setTokensUsed(data.ai_tokens_used_this_month ?? 0);
        const p = (data.ai_provider as Provider) || 'lovable';
        setProvider(p);
        setModel(data.ai_model || '');
        setBaseUrl(data.ai_base_url || '');
        setFallback(data.ai_fallback_to_platform ?? true);
        if (p !== 'lovable' && data.ai_model) {
          const inCurated = CURATED_MODELS[p]?.some(m => m.value === data.ai_model);
          setUseCustomModel(!inCurated);
        }
      }
      setHasStoredKey(!!hasKeyRes.data);
      setLoading(false);
    })();
  }, [profile?.organization_id]);

  const handleSave = async () => {
    if (!profile?.organization_id || !isAdmin) return;
    setSaving(true);
    try {
      const updatePayload: any = {
        ai_enabled: aiEnabled,
        ai_monthly_token_limit: monthlyLimit,
        ai_provider: provider,
        ai_model: isBYOK ? (model || null) : null,
        ai_base_url: provider === 'custom' ? (baseUrl || null) : null,
        ai_fallback_to_platform: fallback,
      };
      const { error } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', profile.organization_id!);
      if (error) throw error;

      // Save API key if user typed a new one
      if (isBYOK && apiKey.trim().length > 0) {
        const { error: keyErr } = await supabase.rpc('set_org_ai_key' as any, {
          _org_id: profile.organization_id!,
          _plaintext: apiKey.trim(),
        });
        if (keyErr) throw keyErr;
        setApiKey('');
        setHasStoredKey(true);
      }

      toast({ title: language === 'ar' ? 'تم حفظ إعدادات الذكاء الاصطناعي' : 'AI settings saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!profile?.organization_id) return;
    if (!confirm(language === 'ar' ? 'حذف مفتاح API المخزّن؟' : 'Remove the stored API key?')) return;
    const { error } = await supabase.rpc('set_org_ai_key' as any, {
      _org_id: profile.organization_id!,
      _plaintext: '',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setHasStoredKey(false);
    toast({ title: language === 'ar' ? 'تم حذف المفتاح' : 'Key removed' });
  };

  const handleTest = async () => {
    if (!profile?.organization_id || !isBYOK) return;
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          provider,
          model: model || null,
          base_url: provider === 'custom' ? baseUrl : null,
          api_key: apiKey.trim() || null, // if empty, server uses stored key
          organization_id: profile.organization_id,
        }),
      });
      const json = await resp.json();
      if (json.ok) {
        toast({
          title: language === 'ar' ? 'الاتصال ناجح' : 'Connection successful',
          description: language === 'ar' ? `النموذج: ${json.model}` : `Model: ${json.model}`,
        });
      } else {
        toast({
          title: language === 'ar' ? 'فشل الاتصال' : 'Connection failed',
          description: json.error || `Status ${json.status || ''}`,
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-20 bg-muted rounded" /></div>;

  const usagePercent = monthlyLimit > 0 ? Math.min(100, Math.round((tokensUsed / monthlyLimit) * 100)) : 0;
  const modelOptions = CURATED_MODELS[provider] || [];

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
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} disabled={!isAdmin} />
        </div>
      </div>

      {aiEnabled && (
        <>
          {/* Provider config */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
                <KeyRound size={16} className="text-accent" />
                {language === 'ar' ? 'مزوّد الذكاء الاصطناعي' : 'AI Provider'}
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${isBYOK ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'}`}>
                {isBYOK
                  ? (language === 'ar' ? 'يستخدم مفتاحك الخاص' : 'Using your own key')
                  : (language === 'ar' ? 'يستخدم الذكاء الاصطناعي للمنصة' : 'Using platform AI')}
              </span>
            </div>

            <FormField label={language === 'ar' ? 'المزوّد' : 'Provider'}>
              <FormSelect
                value={provider}
                onValueChange={(v) => { setProvider(v as Provider); setUseCustomModel(false); setModel(''); }}
                disabled={!isAdmin}
                options={PROVIDER_OPTIONS.map(o => ({ value: o.value, label: language === 'ar' ? o.labelAr : o.label }))}
              />
            </FormField>

            {isBYOK && (
              <>
                {provider === 'custom' && (
                  <FormField label={language === 'ar' ? 'رابط الـ Base URL' : 'Base URL'} required>
                    <FormInput
                      type="url"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="https://api.openrouter.ai/api/v1"
                      disabled={!isAdmin}
                    />
                  </FormField>
                )}

                <FormField label={language === 'ar' ? 'النموذج' : 'Model'}>
                  {modelOptions.length > 0 && !useCustomModel ? (
                    <div className="space-y-2">
                      <FormSelect value={model} onChange={e => setModel(e.target.value)} disabled={!isAdmin}>
                        <option value="">{language === 'ar' ? 'اختر نموذجاً...' : 'Select a model...'}</option>
                        {modelOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </FormSelect>
                      <button type="button" className="text-xs text-accent hover:underline" onClick={() => setUseCustomModel(true)}>
                        {language === 'ar' ? 'استخدم اسم نموذج مخصص' : 'Use a custom model name'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FormInput
                        type="text"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        placeholder={provider === 'custom' ? 'gpt-4o, llama-3.1-70b, ...' : 'model identifier'}
                        disabled={!isAdmin}
                      />
                      {modelOptions.length > 0 && (
                        <button type="button" className="text-xs text-accent hover:underline" onClick={() => { setUseCustomModel(false); setModel(''); }}>
                          {language === 'ar' ? 'العودة إلى النماذج المقترحة' : 'Back to suggested models'}
                        </button>
                      )}
                    </div>
                  )}
                </FormField>

                <FormField label={language === 'ar' ? 'مفتاح API' : 'API Key'}>
                  <div className="space-y-2">
                    <FormInput
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder={hasStoredKey
                        ? (language === 'ar' ? '•••••••• (مخزّن — اتركه فارغاً للإبقاء عليه)' : '•••••••• (stored — leave blank to keep)')
                        : (language === 'ar' ? 'الصق مفتاح API الخاص بك' : 'Paste your API key')}
                      disabled={!isAdmin}
                      autoComplete="off"
                    />
                    <div className="flex items-center gap-3 text-xs">
                      {hasStoredKey ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 size={14} /> {language === 'ar' ? 'مفتاح مخزّن ومشفّر' : 'Encrypted key stored'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle size={14} /> {language === 'ar' ? 'لا يوجد مفتاح مخزّن' : 'No key stored'}
                        </span>
                      )}
                      {hasStoredKey && isAdmin && (
                        <button type="button" onClick={handleClearKey} className="text-destructive hover:underline">
                          {language === 'ar' ? 'حذف المفتاح' : 'Remove key'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck size={12} />
                      {language === 'ar'
                        ? 'يُخزَّن المفتاح مشفّراً في قاعدة البيانات ولا يُكشف للمتصفّح أبداً.'
                        : 'Key is encrypted at rest and never exposed to the browser.'}
                    </p>
                  </div>
                </FormField>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-body-sm font-medium text-foreground">
                      {language === 'ar' ? 'الرجوع إلى ذكاء المنصة عند الفشل' : 'Fallback to platform AI on failure'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar'
                        ? 'في حال فشل مفتاحك (انتهت الحصة أو غير صالح)، سيتم استخدام ذكاء المنصة وتنبيه المستخدم.'
                        : "If your key fails (quota/invalid), retry on the platform's AI and warn the user."}
                    </p>
                  </div>
                  <Switch checked={fallback} onCheckedChange={setFallback} disabled={!isAdmin} />
                </div>

                <div>
                  <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !isAdmin || (!apiKey && !hasStoredKey) || (provider === 'custom' && !baseUrl)}>
                    {testing ? <Loader2 size={14} className="me-2 animate-spin" /> : <CheckCircle2 size={14} className="me-2" />}
                    {language === 'ar' ? 'اختبار الاتصال' : 'Test connection'}
                  </Button>
                </div>
              </>
            )}

            {!isBYOK && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-body-sm text-foreground">
                <Sparkles size={16} className="inline me-2 text-accent" />
                {language === 'ar'
                  ? 'ميزات الذكاء الاصطناعي مدعومة بواسطة Lovable Cloud. لا حاجة لإعداد مفتاح API.'
                  : 'AI features are powered by Lovable Cloud. No API key setup needed.'}
              </div>
            )}
          </div>

          <FormField label={t('ai.settings.monthlyLimit')}>
            <FormInput
              type="number"
              value={monthlyLimit}
              onChange={e => setMonthlyLimit(parseInt(e.target.value) || 0)}
              min={10000}
              step={10000}
              disabled={!isAdmin}
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

      {isAdmin && (
        <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {saving ? <Loader2 size={16} className="me-2 animate-spin" /> : <Save size={16} className="me-2" />}
          {t('common.save')}
        </Button>
      )}

      {aiEnabled && <AIUsageDashboard />}
    </div>
  );
}
