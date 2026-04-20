import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, DollarSign, TrendingUp, Building2, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';

type Range = 'this_month' | 'last_month' | 'this_year' | 'all';

function bounds(r: Range) {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  const f = (d: Date) => d.toISOString().slice(0, 10);
  if (r === 'this_month') return { from: f(new Date(y, m, 1)), to: f(new Date(y, m + 1, 0)) };
  if (r === 'last_month') return { from: f(new Date(y, m - 1, 1)), to: f(new Date(y, m, 0)) };
  if (r === 'this_year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: '1970-01-01', to: f(now) };
}

function fmt(n: number, c: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n); }
  catch { return `${Math.round(n).toLocaleString()} ${c}`; }
}

export default function AdminRevenuePage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const [range, setRange] = useState<Range>('this_month');
  const { from, to } = useMemo(() => bounds(range), [range]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue', from, to],
    queryFn: async () => {
      const [invRes, payRes, orgRes] = await Promise.all([
        supabase.from('invoices').select('id, organization_id, currency, total_amount, amount_paid, status, issue_date')
          .gte('issue_date', from).lte('issue_date', to),
        supabase.from('payments').select('id, organization_id, amount, currency, payment_date')
          .gte('payment_date', from).lte('payment_date', to),
        supabase.from('organizations').select('id, name, name_ar, subscription_tier'),
      ]);
      const orgs = new Map((orgRes.data ?? []).map((o: any) => [o.id, o]));
      const byOrg: Record<string, { name: string; nameAr: string; tier: string; invoiced: number; collected: number; outstanding: number; ccy: string }> = {};
      for (const i of invRes.data ?? []) {
        const o: any = orgs.get(i.organization_id);
        if (!o) continue;
        const k = i.organization_id;
        const b = (byOrg[k] ||= { name: o.name, nameAr: o.name_ar || o.name, tier: o.subscription_tier || 'trial', invoiced: 0, collected: 0, outstanding: 0, ccy: i.currency });
        if (i.status !== 'cancelled' && i.status !== 'written_off' && i.status !== 'draft') {
          b.invoiced += Number(i.total_amount);
          b.outstanding += Number(i.total_amount) - Number(i.amount_paid);
        }
      }
      for (const p of payRes.data ?? []) {
        const o: any = orgs.get(p.organization_id);
        if (!o) continue;
        const k = p.organization_id;
        const b = (byOrg[k] ||= { name: o.name, nameAr: o.name_ar || o.name, tier: o.subscription_tier || 'trial', invoiced: 0, collected: 0, outstanding: 0, ccy: p.currency });
        b.collected += Number(p.amount);
      }
      const rows = Object.entries(byOrg).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.collected - a.collected);
      const totals = rows.reduce((s, r) => ({ invoiced: s.invoiced + r.invoiced, collected: s.collected + r.collected, outstanding: s.outstanding + r.outstanding }), { invoiced: 0, collected: 0, outstanding: 0 });
      return { rows, totals, orgCount: rows.length };
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Revenue"
        titleAr="إيرادات المنصة"
        secondaryActions={[{ label: 'Print / Export', labelAr: 'طباعة / تصدير', icon: Download, onClick: () => window.print() }]}
      />

      <div className="flex items-center gap-3">
        <span className="text-body-sm text-muted-foreground">{isEN ? 'Period' : 'الفترة'}</span>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">{isEN ? 'This month' : 'هذا الشهر'}</SelectItem>
            <SelectItem value="last_month">{isEN ? 'Last month' : 'الشهر الماضي'}</SelectItem>
            <SelectItem value="this_year">{isEN ? 'This year' : 'هذه السنة'}</SelectItem>
            <SelectItem value="all">{isEN ? 'All time' : 'كل الفترات'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Active orgs" labelAr="مؤسسات نشطة" value={(data?.orgCount ?? 0).toLocaleString()} accent />
        <StatCard icon={Receipt} label="Total invoiced" labelAr="إجمالي المفوتر" value={Math.round(data?.totals.invoiced ?? 0).toLocaleString()} />
        <StatCard icon={TrendingUp} label="Total collected" labelAr="إجمالي المحصّل" value={Math.round(data?.totals.collected ?? 0).toLocaleString()} />
        <StatCard icon={DollarSign} label="Outstanding" labelAr="مستحق" value={Math.round(data?.totals.outstanding ?? 0).toLocaleString()} />
      </div>

      <Card className="p-5">
        <h3 className="text-heading-md font-semibold text-primary mb-4">{isEN ? 'By organization' : 'حسب المؤسسة'}</h3>
        {(data?.rows.length ?? 0) === 0 ? (
          <EmptyState icon={Building2} title="No revenue activity" titleAr="لا يوجد نشاط إيرادي" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEN ? 'Organization' : 'المؤسسة'}</TableHead>
                <TableHead>{isEN ? 'Tier' : 'الباقة'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Invoiced' : 'مفوتر'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Collected' : 'محصّل'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Outstanding' : 'مستحق'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{isEN ? r.name : r.nameAr}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{r.tier}</TableCell>
                  <TableCell className="text-end tabular">{fmt(r.invoiced, r.ccy)}</TableCell>
                  <TableCell className="text-end tabular text-success">{fmt(r.collected, r.ccy)}</TableCell>
                  <TableCell className="text-end tabular font-medium">{fmt(r.outstanding, r.ccy)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
