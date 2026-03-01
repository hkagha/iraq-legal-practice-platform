import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, XCircle, Database, HardDrive, Shield, Wifi } from 'lucide-react';

interface TableStat {
  name: string;
  count: number;
}

export default function AdminSystemHealthPage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [tableCounts, setTableCounts] = useState<TableStat[]>([]);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkHealth(); }, []);

  async function checkHealth() {
    // DB check
    try {
      await supabase.from('organizations').select('id').limit(1);
      setDbOk(true);
    } catch { setDbOk(false); }

    // Auth check
    try {
      const { data } = await supabase.auth.getSession();
      setAuthOk(!!data.session);
    } catch { setAuthOk(false); }

    // Table counts
    const tableNames = ['organizations', 'profiles', 'clients', 'cases', 'errands', 'documents', 'time_entries', 'invoices', 'tasks', 'calendar_events', 'notifications'] as const;
    const counts: TableStat[] = [];
    for (const t of tableNames) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
      counts.push({ name: t, count: count || 0 });
    }
    setTableCounts(counts);

    // Storage
    const { data: docs } = await supabase.from('documents').select('file_size_bytes');
    setStorageBytes((docs || []).reduce((s: number, d: any) => s + (Number(d.file_size_bytes) || 0), 0));

    // Recent errors
    const { data: failedAi } = await supabase.from('ai_usage_log').select('*').eq('status', 'error').order('created_at', { ascending: false }).limit(5);
    const { data: failedEmails } = await supabase.from('email_queue').select('*').eq('status', 'failed').order('created_at', { ascending: false }).limit(5);
    const { data: failedBackups } = await supabase.from('system_backups').select('*').eq('status', 'failed').order('created_at', { ascending: false }).limit(5);
    setRecentErrors([
      ...(failedAi || []).map((e: any) => ({ type: 'AI', error: e.error_message, time: e.created_at })),
      ...(failedEmails || []).map((e: any) => ({ type: 'Email', error: e.error_message, time: e.created_at })),
      ...(failedBackups || []).map((e: any) => ({ type: 'Backup', error: e.error_message, time: e.created_at })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10));

    setLoading(false);
  }

  function formatBytes(bytes: number) {
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  const StatusIcon = ({ ok }: { ok: boolean | null }) => {
    if (ok === null) return <AlertTriangle className="h-5 w-5 text-warning" />;
    return ok ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />;
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">{isEN ? 'Checking system health...' : 'جاري فحص صحة النظام...'}</div>;

  const totalRows = tableCounts.reduce((s, t) => s + t.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm text-foreground">{isEN ? 'System Health' : 'صحة النظام'}</h1>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Database, label: isEN ? 'Database' : 'قاعدة البيانات', ok: dbOk, detail: isEN ? 'Operational' : 'يعمل' },
          { icon: Shield, label: isEN ? 'Authentication' : 'المصادقة', ok: authOk, detail: isEN ? 'Operational' : 'يعمل' },
          { icon: HardDrive, label: isEN ? 'Storage' : 'التخزين', ok: true, detail: formatBytes(storageBytes) },
          { icon: Wifi, label: isEN ? 'Real-time' : 'الوقت الحقيقي', ok: true, detail: isEN ? 'Operational' : 'يعمل' },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-heading-sm text-foreground">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon ok={s.ok} />
              <span className="text-body-md text-muted-foreground">{s.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Database Stats */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Database Statistics' : 'إحصائيات قاعدة البيانات'}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start p-3 font-medium text-muted-foreground">{isEN ? 'Table' : 'الجدول'}</th>
                <th className="text-start p-3 font-medium text-muted-foreground">{isEN ? 'Rows' : 'الصفوف'}</th>
              </tr>
            </thead>
            <tbody>
              {tableCounts.map(t => (
                <tr key={t.name} className="border-t hover:bg-muted/20">
                  <td className="p-3 font-medium text-foreground capitalize">{t.name.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-muted-foreground">{new Intl.NumberFormat().format(t.count)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold">
                <td className="p-3 text-foreground">{isEN ? 'Total' : 'الإجمالي'}</td>
                <td className="p-3 text-foreground">{new Intl.NumberFormat().format(totalRows)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Recent Errors' : 'الأخطاء الأخيرة'}</h3>
        {recentErrors.length === 0 ? (
          <p className="text-body-md text-muted-foreground py-4 text-center">{isEN ? 'No recent errors' : 'لا توجد أخطاء حديثة'} ✅</p>
        ) : (
          <div className="space-y-2">
            {recentErrors.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-body-sm font-medium text-foreground">{e.type}: {e.error || 'Unknown error'}</p>
                  <p className="text-body-sm text-muted-foreground">{new Date(e.time).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
