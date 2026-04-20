import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/StatCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';

type Range = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'ytd';

function rangeBounds(r: Range): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (r === 'this_month') return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  if (r === 'last_month') return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
  if (r === 'this_quarter') { const q = Math.floor(m / 3) * 3; return { from: fmt(new Date(y, q, 1)), to: fmt(new Date(y, q + 3, 0)) }; }
  if (r === 'this_year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: `${y}-01-01`, to: fmt(now) };
}

function fmtMoney(n: number, ccy: string, lang: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-IQ', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
  } catch { return `${Math.round(n).toLocaleString()} ${ccy}`; }
}

export default function FinancialSummaryReport() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isEN = language === 'en';
  const orgId = profile?.organization_id;
  const [range, setRange] = useState<Range>('this_month');

  const { from, to } = useMemo(() => rangeBounds(range), [range]);

  const { data, isLoading } = useQuery({
    queryKey: ['fin-summary', orgId, from, to],
    enabled: !!orgId,
    queryFn: async () => {
      const [invRes, payRes] = await Promise.all([
        supabase.from('invoices')
          .select('id, invoice_number, status, currency, total_amount, amount_paid, issue_date, due_date')
          .eq('organization_id', orgId!)
          .gte('issue_date', from).lte('issue_date', to),
        supabase.from('payments')
          .select('id, invoice_id, amount, currency, payment_date, payment_method')
          .eq('organization_id', orgId!)
          .gte('payment_date', from).lte('payment_date', to),
      ]);
      const invoices = invRes.data ?? [];
      const payments = payRes.data ?? [];

      const byCcy: Record<string, { invoiced: number; collected: number; outstanding: number; count: number }> = {};
      for (const i of invoices) {
        const c = i.currency || 'IQD';
        const b = (byCcy[c] ||= { invoiced: 0, collected: 0, outstanding: 0, count: 0 });
        if (i.status !== 'cancelled' && i.status !== 'written_off' && i.status !== 'draft') {
          b.invoiced += Number(i.total_amount);
          b.outstanding += Number(i.total_amount) - Number(i.amount_paid);
          b.count += 1;
        }
      }
      for (const p of payments) {
        const c = p.currency || 'IQD';
        const b = (byCcy[c] ||= { invoiced: 0, collected: 0, outstanding: 0, count: 0 });
        b.collected += Number(p.amount);
      }

      const totals = {
        invoicedAll: Object.values(byCcy).reduce((s, v) => s + v.invoiced, 0),
        collectedAll: Object.values(byCcy).reduce((s, v) => s + v.collected, 0),
        outstandingAll: Object.values(byCcy).reduce((s, v) => s + v.outstanding, 0),
        invoiceCount: invoices.length,
      };

      // top invoices by balance
      const topOutstanding = invoices
        .filter(i => i.status !== 'cancelled' && i.status !== 'written_off' && i.status !== 'draft')
        .map(i => ({ ...i, balance: Number(i.total_amount) - Number(i.amount_paid) }))
        .filter(i => i.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);

      return { byCcy, totals, topOutstanding, paymentCount: payments.length };
    },
  });

  if (isLoading) return <PageLoader />;

  const orgCcy = (data?.byCcy && Object.keys(data.byCcy)[0]) || 'IQD';

  return (
    <div className="space-y-5 print:p-0">
      <PageHeader
        title="Financial Summary"
        titleAr="الملخص المالي"
        helpKey="reports.financial-summary"
        secondaryActions={[{ label: 'Print / Export', labelAr: 'طباعة / تصدير', icon: Download, onClick: () => window.print() }]}
      />

      <div className="flex items-center gap-3">
        <span className="text-body-sm text-muted-foreground">{isEN ? 'Period' : 'الفترة'}</span>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">{isEN ? 'This month' : 'هذا الشهر'}</SelectItem>
            <SelectItem value="last_month">{isEN ? 'Last month' : 'الشهر الماضي'}</SelectItem>
            <SelectItem value="this_quarter">{isEN ? 'This quarter' : 'هذا الربع'}</SelectItem>
            <SelectItem value="this_year">{isEN ? 'This year' : 'هذه السنة'}</SelectItem>
            <SelectItem value="ytd">{isEN ? 'Year to date' : 'منذ بداية السنة'}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-caption text-muted-foreground">{from} → {to}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Invoices issued" labelAr="فواتير صادرة" value={(data?.totals.invoiceCount ?? 0).toLocaleString()} accent />
        <StatCard icon={DollarSign} label="Invoiced" labelAr="مفوتر" value={fmtMoney(data?.totals.invoicedAll ?? 0, orgCcy, isEN ? 'en' : 'ar')} />
        <StatCard icon={TrendingUp} label="Collected" labelAr="محصّل" value={fmtMoney(data?.totals.collectedAll ?? 0, orgCcy, isEN ? 'en' : 'ar')} />
        <StatCard icon={AlertCircle} label="Outstanding" labelAr="مستحق" value={fmtMoney(data?.totals.outstandingAll ?? 0, orgCcy, isEN ? 'en' : 'ar')} />
      </div>

      <Card className="p-5">
        <h3 className="text-heading-md font-semibold text-primary mb-4">{isEN ? 'By currency' : 'حسب العملة'}</h3>
        {Object.keys(data?.byCcy ?? {}).length === 0 ? (
          <EmptyState icon={DollarSign} title="No financial activity" titleAr="لا يوجد نشاط مالي" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEN ? 'Currency' : 'العملة'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Invoices' : 'الفواتير'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Invoiced' : 'مفوتر'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Collected' : 'محصّل'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Outstanding' : 'مستحق'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data!.byCcy).map(([ccy, b]) => (
                <TableRow key={ccy}>
                  <TableCell className="font-mono font-semibold">{ccy}</TableCell>
                  <TableCell className="text-end tabular">{b.count.toLocaleString()}</TableCell>
                  <TableCell className="text-end tabular">{fmtMoney(b.invoiced, ccy, isEN ? 'en' : 'ar')}</TableCell>
                  <TableCell className="text-end tabular text-success">{fmtMoney(b.collected, ccy, isEN ? 'en' : 'ar')}</TableCell>
                  <TableCell className="text-end tabular font-medium">{fmtMoney(b.outstanding, ccy, isEN ? 'en' : 'ar')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-heading-md font-semibold text-primary mb-4">
          {isEN ? `Top outstanding invoices (${data?.topOutstanding.length ?? 0})` : `أعلى الفواتير المستحقة (${data?.topOutstanding.length ?? 0})`}
        </h3>
        {(data?.topOutstanding.length ?? 0) === 0 ? (
          <EmptyState icon={AlertCircle} title="Nothing outstanding" titleAr="لا توجد مستحقات" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEN ? 'Invoice' : 'الفاتورة'}</TableHead>
                <TableHead>{isEN ? 'Issued' : 'تاريخ الإصدار'}</TableHead>
                <TableHead>{isEN ? 'Due' : 'الاستحقاق'}</TableHead>
                <TableHead>{isEN ? 'Status' : 'الحالة'}</TableHead>
                <TableHead className="text-end">{isEN ? 'Balance' : 'الرصيد'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.topOutstanding.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono">{i.invoice_number}</TableCell>
                  <TableCell>{i.issue_date}</TableCell>
                  <TableCell>{i.due_date || '—'}</TableCell>
                  <TableCell className="capitalize">{i.status}</TableCell>
                  <TableCell className="text-end tabular font-medium">{fmtMoney(i.balance, i.currency, isEN ? 'en' : 'ar')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
