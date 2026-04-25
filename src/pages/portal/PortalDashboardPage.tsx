import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Scale, FileCheck, FileText, Receipt, MessageSquare, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

function fmt(n: number, c: string, lang: 'en' | 'ar') {
  try { return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-IQ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n); }
  catch { return `${Math.round(n).toLocaleString()} ${c}`; }
}

export default function PortalDashboardPage() {
  const { language } = useLanguage();
  const { profile, getFullName } = useAuth();
  const { activeOrg } = usePortalOrg();
  const isEN = language === 'en';
  const orgId = activeOrg?.id || null;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-dashboard', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [casesRes, errandsRes, invoicesRes, hearingsRes, messagesRes] = await Promise.all([
        supabase.from('cases').select('id, case_number, title, title_ar, status, updated_at, organization_id')
          .eq('organization_id', orgId!)
          .eq('is_visible_to_client', true).order('updated_at', { ascending: false }).limit(5),
        supabase.from('errands').select('id, errand_number, title, title_ar, status, updated_at, completed_steps, total_steps, organization_id')
          .eq('organization_id', orgId!)
          .eq('is_visible_to_client', true).order('updated_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('id, invoice_number, currency, total_amount, amount_paid, due_date, status, organization_id')
          .eq('organization_id', orgId!)
          .neq('status', 'draft'),
        supabase.from('case_hearings').select('id, hearing_date, hearing_time, hearing_type, case_id, organization_id, cases(case_number, title, title_ar)')
          .eq('organization_id', orgId!)
          .eq('is_visible_to_client', true).gte('hearing_date', today).order('hearing_date').limit(5),
        supabase.from('client_messages').select('id').eq('organization_id', orgId!).eq('is_read', false).eq('sender_type', 'staff'),
      ]);
      const invoices = invoicesRes.data ?? [];
      const outstandingByCcy: Record<string, number> = {};
      for (const i of invoices) {
        const bal = Number(i.total_amount) - Number(i.amount_paid);
        if (bal > 0) outstandingByCcy[i.currency] = (outstandingByCcy[i.currency] || 0) + bal;
      }
      return {
        cases: casesRes.data ?? [],
        errands: errandsRes.data ?? [],
        hearings: hearingsRes.data ?? [],
        unreadMessages: messagesRes.data?.length ?? 0,
        outstandingByCcy,
        casesCount: (casesRes.data ?? []).length,
        errandsCount: (errandsRes.data ?? []).length,
      };
    },
  });

  if (isLoading) return <PageLoader />;

  const outstandingDisplay = Object.entries(data?.outstandingByCcy ?? {}).map(([c, v]) => fmt(v, c, isEN ? 'en' : 'ar')).join(' • ') || (isEN ? 'None' : 'لا شيء');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm font-bold text-primary mb-1">
          {isEN ? `Welcome, ${getFullName()}` : `أهلاً، ${getFullName()}`}
        </h1>
        <p className="text-body-sm text-muted-foreground">
          {isEN ? 'A summary of your cases, errands, and finances.' : 'ملخص لقضاياك ومعاملاتك وحساباتك المالية.'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/portal/cases"><StatCard icon={Scale} label="Active cases" labelAr="القضايا النشطة" value={data?.casesCount ?? 0} accent /></Link>
        <Link to="/portal/errands"><StatCard icon={FileCheck} label="Active errands" labelAr="المعاملات النشطة" value={data?.errandsCount ?? 0} /></Link>
        <Link to="/portal/invoices"><StatCard icon={Receipt} label="Outstanding" labelAr="المستحق" value={outstandingDisplay} /></Link>
        <Link to="/portal/messages"><StatCard icon={MessageSquare} label="Unread messages" labelAr="رسائل غير مقروءة" value={data?.unreadMessages ?? 0} /></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading-md font-semibold text-primary">{isEN ? 'Upcoming hearings' : 'الجلسات القادمة'}</h3>
            <Link to="/portal/cases" className="text-body-sm text-accent hover:underline">{isEN ? 'View all' : 'عرض الكل'}</Link>
          </div>
          {(data?.hearings.length ?? 0) === 0 ? (
            <p className="text-body-sm text-muted-foreground text-center py-6">{isEN ? 'No upcoming hearings.' : 'لا توجد جلسات قادمة.'}</p>
          ) : (
            <div className="space-y-2">
              {data!.hearings.map((h: any) => (
                <Link key={h.id} to={`/portal/cases/${h.case_id}`} className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/40 border border-border">
                  <div className="h-9 w-9 rounded bg-accent/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-medium truncate">{isEN ? h.cases?.title : (h.cases?.title_ar || h.cases?.title)}</div>
                    <div className="text-caption text-muted-foreground">{format(new Date(h.hearing_date), 'PPP')} {h.hearing_time && `• ${h.hearing_time}`}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading-md font-semibold text-primary">{isEN ? 'Recent cases' : 'القضايا الأخيرة'}</h3>
            <Link to="/portal/cases" className="text-body-sm text-accent hover:underline">{isEN ? 'View all' : 'عرض الكل'}</Link>
          </div>
          {(data?.cases.length ?? 0) === 0 ? (
            <p className="text-body-sm text-muted-foreground text-center py-6">{isEN ? 'No cases shared with you yet.' : 'لم تتم مشاركة قضايا معك بعد.'}</p>
          ) : (
            <div className="space-y-2">
              {data!.cases.map((c: any) => (
                <Link key={c.id} to={`/portal/cases/${c.id}`} className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/40 border border-border">
                  <div className="h-9 w-9 rounded bg-accent/10 flex items-center justify-center">
                    <Scale className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-medium truncate">{isEN ? c.title : (c.title_ar || c.title)}</div>
                    <div className="text-caption text-muted-foreground font-mono">{c.case_number}</div>
                  </div>
                  <StatusBadge status={c.status} type="case" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-md font-semibold text-primary">{isEN ? 'Recent errands' : 'المعاملات الأخيرة'}</h3>
          <Link to="/portal/errands" className="text-body-sm text-accent hover:underline">{isEN ? 'View all' : 'عرض الكل'}</Link>
        </div>
        {(data?.errands.length ?? 0) === 0 ? (
          <p className="text-body-sm text-muted-foreground text-center py-6">{isEN ? 'No errands yet.' : 'لا توجد معاملات بعد.'}</p>
        ) : (
          <div className="space-y-2">
            {data!.errands.map((e: any) => (
              <Link key={e.id} to={`/portal/errands/${e.id}`} className="flex items-center gap-3 p-3 rounded-md hover:bg-secondary/40 border border-border">
                <div className="h-9 w-9 rounded bg-accent/10 flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium truncate">{isEN ? e.title : (e.title_ar || e.title)}</div>
                  <div className="text-caption text-muted-foreground">{e.completed_steps}/{e.total_steps} {isEN ? 'steps' : 'خطوات'}</div>
                </div>
                <StatusBadge status={e.status} type="errand" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
