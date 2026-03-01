import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, AlertTriangle, Building } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function AdminRevenuePage() {
  const { language } = useLanguage();
  const isEN = language === 'en';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [activeOrgCount, setActiveOrgCount] = useState(1);
  const [orgRevenue, setOrgRevenue] = useState<{ name: string; amount: number; id: string }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; amount: number }[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [paymentsRes, invoicesRes, orgsRes, orgNamesRes] = await Promise.all([
      supabase.from('payments').select('amount, payment_date, organization_id'),
      supabase.from('invoices').select('id, invoice_number, total_amount, amount_paid, due_date, status, organization_id, client_id'),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('organizations').select('id, name'),
    ]);

    const payments = paymentsRes.data || [];
    const invoices = invoicesRes.data || [];
    const orgNames: Record<string, string> = {};
    (orgNamesRes.data || []).forEach((o: any) => { orgNames[o.id] = o.name; });

    const total = payments.reduce((s, p: any) => s + (Number(p.amount) || 0), 0);
    const thisMonth = payments.filter((p: any) => p.payment_date >= monthStart).reduce((s, p: any) => s + (Number(p.amount) || 0), 0);
    const outstandingAmt = invoices.filter((i: any) => !['paid', 'cancelled', 'written_off'].includes(i.status))
      .reduce((s, i: any) => s + ((Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0)), 0);

    setTotalRevenue(total);
    setMonthRevenue(thisMonth);
    setOutstanding(outstandingAmt);
    setActiveOrgCount(orgsRes.count || 1);

    // Revenue by org (top 10)
    const byOrg: Record<string, number> = {};
    payments.forEach((p: any) => { byOrg[p.organization_id] = (byOrg[p.organization_id] || 0) + (Number(p.amount) || 0); });
    const sorted = Object.entries(byOrg).map(([id, amount]) => ({ id, name: orgNames[id] || id.slice(0, 8), amount }))
      .sort((a, b) => b.amount - a.amount).slice(0, 10);
    setOrgRevenue(sorted);

    // Monthly trend (last 12)
    const trend: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trend[key] = 0;
    }
    payments.forEach((p: any) => {
      const key = p.payment_date?.slice(0, 7);
      if (key && trend[key] !== undefined) trend[key] += Number(p.amount) || 0;
    });
    setMonthlyTrend(Object.entries(trend).map(([month, amount]) => ({ month, amount })));

    // Overdue invoices
    const today = now.toISOString().split('T')[0];
    const overdue = invoices.filter((i: any) => i.due_date < today && ['sent', 'viewed', 'overdue', 'partially_paid'].includes(i.status))
      .map((i: any) => ({
        ...i, orgName: orgNames[i.organization_id] || '—',
        balanceDue: (Number(i.total_amount) || 0) - (Number(i.amount_paid) || 0),
        daysOverdue: Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000),
      })).sort((a: any, b: any) => b.daysOverdue - a.daysOverdue).slice(0, 20);
    setOverdueInvoices(overdue);
    setLoading(false);
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">{isEN ? 'Loading...' : 'جاري التحميل...'}</div>;

  const kpis = [
    { label: isEN ? 'Total Revenue' : 'إجمالي الإيرادات', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
    { label: isEN ? 'This Month' : 'هذا الشهر', value: `$${monthRevenue.toLocaleString()}`, icon: TrendingUp },
    { label: isEN ? 'Outstanding' : 'المستحقات', value: `$${outstanding.toLocaleString()}`, icon: AlertTriangle },
    { label: isEN ? 'Avg per Org' : 'متوسط لكل مؤسسة', value: `$${Math.round(totalRevenue / activeOrgCount).toLocaleString()}`, icon: Building },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-display-sm text-foreground">{isEN ? 'Revenue' : 'الإيرادات'}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border rounded-lg p-4">
            <k.icon className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-heading-lg text-foreground">{k.value}</p>
            <p className="text-body-sm text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Revenue by Organization' : 'الإيرادات حسب المؤسسة'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orgRevenue} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="amount" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} cursor="pointer"
                onClick={(d: any) => { if (d?.id) navigate(`/admin/organizations/${d.id}`); }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Monthly Revenue Trend' : 'اتجاه الإيرادات الشهري'}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-5">
        <h3 className="text-heading-sm text-foreground mb-4">{isEN ? 'Overdue Invoices' : 'الفواتير المتأخرة'}</h3>
        {overdueInvoices.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">{isEN ? 'No overdue invoices' : 'لا توجد فواتير متأخرة'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[isEN ? 'Organization' : 'المؤسسة', isEN ? 'Invoice' : 'الفاتورة', isEN ? 'Amount' : 'المبلغ', isEN ? 'Balance' : 'الرصيد', isEN ? 'Days Overdue' : 'أيام التأخير'].map(h => (
                    <th key={h} className="text-start p-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueInvoices.map((inv: any) => (
                  <tr key={inv.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 text-foreground">{inv.orgName}</td>
                    <td className="p-3">{inv.invoice_number}</td>
                    <td className="p-3">${Number(inv.total_amount).toLocaleString()}</td>
                    <td className="p-3 text-destructive font-medium">${inv.balanceDue.toLocaleString()}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-body-sm">{inv.daysOverdue}d</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
