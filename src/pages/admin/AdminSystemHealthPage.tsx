import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Mail, HardDrive, Users, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';

type Status = 'healthy' | 'warning' | 'down';

function StatusPill({ s, label }: { s: Status; label: string }) {
  const color = s === 'healthy' ? 'bg-success/10 text-success' : s === 'warning' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive';
  const Icon = s === 'down' ? AlertTriangle : CheckCircle2;
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium', color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export default function AdminSystemHealthPage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<Status>('healthy');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: async () => {
      const t0 = performance.now();
      const [orgsRes, usersRes, queueRes, failedAi, recentErrors] = await Promise.all([
        supabase.from('organizations').select('id, is_active', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('email_queue').select('id, status'),
        supabase.from('ai_usage_log').select('id').eq('status', 'error').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('admin_audit_log').select('id, action, target_name, created_at').order('created_at', { ascending: false }).limit(8),
      ]);
      const latency = Math.round(performance.now() - t0);
      setDbLatency(latency);
      setDbStatus(latency < 1500 ? 'healthy' : latency < 4000 ? 'warning' : 'down');

      const queue = queueRes.data ?? [];
      const pending = queue.filter((q: any) => q.status === 'pending').length;
      const failed = queue.filter((q: any) => q.status === 'failed').length;
      const sent = queue.filter((q: any) => q.status === 'sent').length;

      return {
        orgsCount: orgsRes.count ?? 0,
        usersCount: usersRes.count ?? 0,
        emailPending: pending, emailFailed: failed, emailSent: sent,
        aiErrors24h: failedAi.data?.length ?? 0,
        recentAudit: recentErrors.data ?? [],
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <PageLoader />;

  const emailStatus: Status = (data?.emailFailed ?? 0) > 5 ? 'warning' : 'healthy';
  const aiStatus: Status = (data?.aiErrors24h ?? 0) > 10 ? 'warning' : 'healthy';

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Health"
        titleAr="صحة النظام"
        secondaryActions={[{ label: 'Refresh', labelAr: 'تحديث', icon: RefreshCw, onClick: () => refetch() }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Database className="h-4 w-4 text-accent" /><span className="text-body-sm font-medium">{isEN ? 'Database' : 'قاعدة البيانات'}</span></div>
            <StatusPill s={dbStatus} label={dbStatus === 'healthy' ? (isEN ? 'Healthy' : 'سليم') : dbStatus === 'warning' ? (isEN ? 'Slow' : 'بطيء') : (isEN ? 'Down' : 'متوقف')} />
          </div>
          <div className="text-display-sm font-display tabular">{dbLatency ?? '—'} <span className="text-body-sm text-muted-foreground font-sans">ms</span></div>
          <div className="text-caption text-muted-foreground mt-1">{isEN ? 'Round-trip latency' : 'زمن الاستجابة'}</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /><span className="text-body-sm font-medium">{isEN ? 'Email queue' : 'طابور البريد'}</span></div>
            <StatusPill s={emailStatus} label={emailStatus === 'healthy' ? (isEN ? 'Healthy' : 'سليم') : (isEN ? 'Backlog' : 'متراكم')} />
          </div>
          <div className="text-display-sm font-display tabular">{data?.emailPending ?? 0}</div>
          <div className="text-caption text-muted-foreground mt-1">
            {isEN ? `${data?.emailSent ?? 0} sent, ${data?.emailFailed ?? 0} failed` : `${data?.emailSent ?? 0} مرسلة، ${data?.emailFailed ?? 0} فاشلة`}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /><span className="text-body-sm font-medium">{isEN ? 'AI service' : 'خدمة الذكاء الاصطناعي'}</span></div>
            <StatusPill s={aiStatus} label={aiStatus === 'healthy' ? (isEN ? 'Healthy' : 'سليم') : (isEN ? 'Errors' : 'أخطاء')} />
          </div>
          <div className="text-display-sm font-display tabular">{data?.aiErrors24h ?? 0}</div>
          <div className="text-caption text-muted-foreground mt-1">{isEN ? 'Errors in last 24h' : 'الأخطاء في آخر 24 ساعة'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Organizations" labelAr="المؤسسات" value={(data?.orgsCount ?? 0).toLocaleString()} accent />
        <StatCard icon={Users} label="Total users" labelAr="إجمالي المستخدمين" value={(data?.usersCount ?? 0).toLocaleString()} />
        <StatCard icon={HardDrive} label="DB latency" labelAr="استجابة قاعدة البيانات" value={`${dbLatency ?? 0} ms`} />
        <StatCard icon={Activity} label="Last refresh" labelAr="آخر تحديث" value={isFetching ? (isEN ? 'Refreshing…' : 'جارٍ…') : (isEN ? 'Just now' : 'الآن')} />
      </div>

      <Card className="p-5">
        <h3 className="text-heading-md font-semibold text-primary mb-4">{isEN ? 'Recent admin activity' : 'النشاط الإداري الأخير'}</h3>
        {(data?.recentAudit.length ?? 0) === 0 ? (
          <p className="text-body-sm text-muted-foreground text-center py-6">{isEN ? 'No recent activity.' : 'لا يوجد نشاط حديث.'}</p>
        ) : (
          <div className="divide-y divide-border">
            {data!.recentAudit.map((a: any) => (
              <div key={a.id} className="py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center"><Activity className="h-4 w-4 text-accent" /></div>
                <div className="flex-1">
                  <div className="text-body-sm font-medium text-foreground">{a.action}</div>
                  <div className="text-caption text-muted-foreground">{a.target_name || '—'}</div>
                </div>
                <div className="text-caption text-muted-foreground tabular">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
