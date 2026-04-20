import { useEffect, useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, Save, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import SEO from '@/components/SEO';
import { runConflictCheck, saveConflictCheck, ConflictMatch } from '@/lib/conflictChecker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function ConflictCheckerPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const t = (en: string, ar: string) => (isEN ? en : ar);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ConflictMatch[] | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  async function loadHistory() {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from('conflict_checks' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((data as any[]) || []);
  }

  useEffect(() => {
    loadHistory();
  }, [profile?.organization_id]);

  async function handleRun() {
    if (!name.trim()) {
      toast.error(t('Enter a name to check', 'أدخل اسماً للتحقق'));
      return;
    }
    setRunning(true);
    try {
      const r = await runConflictCheck({
        query_name: name,
        query_phone: phone || undefined,
        query_email: email || undefined,
        query_tax_id: taxId || undefined,
      });
      setResults(r.matches);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    if (!profile || !results) return;
    try {
      await saveConflictCheck({
        organization_id: profile.organization_id!,
        checked_by: profile.id,
        query_name: name,
        query_phone: phone || undefined,
        query_email: email || undefined,
        query_tax_id: taxId || undefined,
        results,
        notes: notes || undefined,
      });
      toast.success(t('Conflict check saved', 'تم حفظ فحص التعارض'));
      setNotes('');
      loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const noMatches = results && results.length === 0;
  const hasMatches = results && results.length > 0;

  return (
    <>
      <SEO
        title={isEN ? 'Conflict Checker' : 'فاحص تعارض المصالح'}
        description={
          isEN
            ? 'Screen new clients and matters for conflicts of interest.'
            : 'فحص العملاء والقضايا الجديدة بحثاً عن تعارض في المصالح.'
        }
      />
      <PageHeader
        title={t('Conflict Checker', 'فاحص تعارض المصالح')}
        subtitle={t(
          'Screen new clients and matters before intake.',
          'فحص العملاء والقضايا الجديدة قبل القبول.'
        )}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t('Run a conflict check', 'تشغيل فحص تعارض')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-body-sm font-medium block mb-1">
                {t('Name (required)', 'الاسم (مطلوب)')}
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Person or company name', 'اسم شخص أو شركة')} />
            </div>
            <div>
              <label className="text-body-sm font-medium block mb-1">{t('Phone', 'الهاتف')}</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964..." />
            </div>
            <div>
              <label className="text-body-sm font-medium block mb-1">{t('Email', 'البريد')}</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label className="text-body-sm font-medium block mb-1">{t('Tax ID', 'الرقم الضريبي')}</label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRun} disabled={running} className="gap-2">
              <Search className="h-4 w-4" />
              {running ? t('Searching…', 'جاري البحث…') : t('Run Check', 'تشغيل الفحص')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card className={`mb-6 border-2 ${noMatches ? 'border-success/50' : 'border-warning/50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {noMatches ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-success" />
                  {t('No conflicts found', 'لم يتم العثور على تعارضات')}
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-warning" />
                  {t(`${results.length} potential conflict(s) found`, `تم العثور على ${results.length} تعارضات محتملة`)}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasMatches && (
              <ul className="divide-y border rounded">
                {results.map((m, idx) => (
                  <li key={`${m.type}-${m.id}-${idx}`} className="p-3 flex items-center justify-between">
                    <div>
                      <Link
                        to={
                          m.type === 'person'
                            ? `/clients` // clients list (person detail navigation)
                            : m.type === 'entity'
                            ? `/clients`
                            : `/cases/${m.id}`
                        }
                        className="font-medium hover:underline"
                      >
                        {m.name}
                      </Link>
                      {m.detail && (
                        <span className="ms-2 text-body-sm text-muted-foreground">{m.detail}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{m.type}</Badge>
                      <Badge variant="secondary">{m.match_reason}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Input
              placeholder={t('Notes (optional)', 'ملاحظات (اختياري)')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button onClick={handleSave} variant="outline" className="gap-2">
              <Save className="h-4 w-4" />
              {t('Save check to record', 'حفظ الفحص في السجل')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {t('Recent checks', 'الفحوصات الأخيرة')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t('No checks yet.', 'لا توجد فحوصات بعد.')}</p>
          ) : (
            <ul className="divide-y">
              {history.map((h: any) => (
                <li key={h.id} className="py-2 flex items-center justify-between text-body-sm">
                  <div>
                    <span className="font-medium">{h.query_name}</span>
                    <span className="text-muted-foreground ms-2">
                      {new Date(h.created_at).toLocaleString(isEN ? 'en-US' : 'ar-IQ')}
                    </span>
                  </div>
                  <Badge variant={h.status === 'clear' ? 'default' : 'destructive'}>
                    {h.status === 'clear' ? t('Clear', 'نظيف') : t('Conflict', 'تعارض')} · {h.match_count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
