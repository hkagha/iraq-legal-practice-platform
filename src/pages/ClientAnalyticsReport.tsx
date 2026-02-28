import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDateRange, getPreviousPeriodRange, type DateRangePreset } from '@/hooks/useReportData';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  gold: 'hsl(42, 50%, 54%)', blue: 'hsl(217, 91%, 60%)', green: 'hsl(142, 71%, 45%)',
  purple: 'hsl(262, 52%, 47%)', red: 'hsl(0, 84%, 60%)', slate: 'hsl(215, 16%, 47%)',
};

export default function ClientAnalyticsReport() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DateRangePreset>('this_year');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset), [preset]);
  const prevRange = useMemo(() => getPreviousPeriodRange(range), [range]);

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const startStr = format(range.start, 'yyyy-MM-dd');
    const endStr = format(range.end, 'yyyy-MM-dd');
    const prevStartStr = format(prevRange.start, 'yyyy-MM-dd');
    const prevEndStr = format(prevRange.end, 'yyyy-MM-dd');

    const [clientsRes, newClientsRes, casesRes, prevCasesRes, errandsRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('id, client_type, governorate, source, first_name, last_name, company_name, created_at').eq('organization_id', orgId),
      supabase.from('clients').select('id, created_at').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
      supabase.from('cases').select('id, client_id, status, created_at').eq('organization_id', orgId).not('status', 'in', '("closed","archived")'),
      supabase.from('cases').select('id, client_id, created_at').eq('organization_id', orgId).gte('created_at', prevStartStr).lte('created_at', prevEndStr),
      supabase.from('errands').select('id, client_id').eq('organization_id', orgId),
      supabase.from('payments').select('id, amount, invoice_id, payment_date').eq('organization_id', orgId),
    ]);

    const clients = clientsRes.data || [];
    const newClients = newClientsRes.data || [];
    const cases = casesRes.data || [];
    const prevCases = prevCasesRes.data || [];
    const errands = errandsRes.data || [];
    const payments = paymentsRes.data || [];

    // Active clients
    const activeClientIds = new Set(cases.map(c => c.client_id));

    // Retention: clients with cases in both periods
    const currentPeriodClientIds = new Set(cases.filter(c => c.created_at >= startStr && c.created_at <= endStr).map(c => c.client_id));
    const prevPeriodClientIds = new Set(prevCases.map(c => c.client_id));
    const retained = [...currentPeriodClientIds].filter(id => prevPeriodClientIds.has(id)).length;
    const retention = prevPeriodClientIds.size > 0 ? Math.round((retained / prevPeriodClientIds.size) * 100) : 0;

    // By type
    const byType: Record<string, number> = {};
    clients.forEach(c => { byType[c.client_type] = (byType[c.client_type] || 0) + 1; });

    // By governorate
    const byGov: Record<string, number> = {};
    clients.forEach(c => { if (c.governorate) byGov[c.governorate] = (byGov[c.governorate] || 0) + 1; });

    // By source
    const bySource: Record<string, number> = {};
    clients.forEach(c => { const src = c.source || 'other'; bySource[src] = (bySource[src] || 0) + 1; });

    // Monthly growth
    const monthlyGrowth: Record<string, number> = {};
    clients.forEach(c => {
      const m = c.created_at?.substring(0, 7);
      if (m) monthlyGrowth[m] = (monthlyGrowth[m] || 0) + 1;
    });
    let cumulative = 0;
    const growthData = Object.entries(monthlyGrowth).sort().map(([m, c]) => {
      cumulative += c;
      return { month: m, total: cumulative };
    });

    // Revenue per client (from payments + invoices)
    // We need invoice→client mapping via cases
    const invoiceRes = await supabase.from('invoices').select('id, case_id, total_amount').eq('organization_id', orgId);
    const invoices = invoiceRes.data || [];
    const invoiceCaseMap = Object.fromEntries(invoices.map(i => [i.id, i.case_id]));
    const caseClientMap = Object.fromEntries(cases.map(c => [c.id, c.client_id]));

    const clientRevenue: Record<string, number> = {};
    payments.forEach(p => {
      const caseId = invoiceCaseMap[p.invoice_id];
      const clientId = caseId ? caseClientMap[caseId] : null;
      if (clientId) clientRevenue[clientId] = (clientRevenue[clientId] || 0) + Number(p.amount || 0);
    });

    // Client case/errand counts
    const clientCaseCounts: Record<string, number> = {};
    cases.forEach(c => { clientCaseCounts[c.client_id] = (clientCaseCounts[c.client_id] || 0) + 1; });
    const clientErrandCounts: Record<string, number> = {};
    errands.forEach(e => { clientErrandCounts[e.client_id] = (clientErrandCounts[e.client_id] || 0) + 1; });

    // Top clients
    const topClients = clients
      .map(c => ({
        id: c.id,
        name: c.client_type === 'company' ? (c.company_name || `${c.first_name} ${c.last_name}`) : `${c.first_name} ${c.last_name}`,
        type: c.client_type,
        cases: clientCaseCounts[c.id] || 0,
        errands: clientErrandCounts[c.id] || 0,
        revenue: clientRevenue[c.id] || 0,
        lastActivity: c.created_at,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    setData({
      totalClients: clients.length,
      newClients: newClients.length,
      activeClients: activeClientIds.size,
      retention,
      byType: Object.entries(byType).map(([t, c]) => ({ type: t, count: c })),
      byGov: Object.entries(byGov).map(([g, c]) => ({ governorate: g, count: c })).sort((a, b) => b.count - a.count),
      bySource: Object.entries(bySource).map(([s, c]) => ({ source: s, count: c })),
      growthData,
      topClients,
      top10Revenue: topClients.slice(0, 10),
    });
    setLoading(false);
  }, [profile?.organization_id, range, prevRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
    { value: 'all_time', label: t('reports.allTime') },
  ];

  const fmtIQD = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M IQD` : `${v.toLocaleString()} IQD`;

  return (
    <div className="print:p-0">
      <PageHeader
        title="Client Analytics" titleAr="تحليلات العملاء"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Client Analytics', labelAr: 'تحليلات العملاء' },
        ]}
        secondaryActions={[{ label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() }]}
      />

      <div className="mb-6 flex items-center gap-3 print:hidden">
        <span className="text-body-sm text-muted-foreground">{t('reports.dateRange')}:</span>
        <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{presetOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">{t('reports.generating')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPI label={language === 'ar' ? 'إجمالي العملاء' : 'Total Clients'} value={data.totalClients} />
            <KPI label={language === 'ar' ? 'عملاء جدد' : 'New Clients'} value={data.newClients} />
            <KPI label={language === 'ar' ? 'عملاء نشطون' : 'Active Clients'} value={data.activeClients} />
            <KPI label={language === 'ar' ? 'الاحتفاظ' : 'Retention'} value={`${data.retention}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'نمو العملاء' : 'Client Growth'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'العملاء حسب النوع' : 'Clients by Type'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="type" paddingAngle={4}>
                      <Cell fill={COLORS.gold} /><Cell fill={COLORS.blue} />
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'العملاء حسب المحافظة' : 'Clients by Governorate'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(280, data.byGov.length * 28)}>
                  <BarChart data={data.byGov.slice(0, 15)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis dataKey="governorate" type="category" width={120} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <Tooltip /><Bar dataKey="count" fill={COLORS.gold} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'مصادر العملاء' : 'Client Source'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.bySource} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="source" paddingAngle={2}>
                      {data.bySource.map((_: any, i: number) => <Cell key={i} fill={[COLORS.gold, COLORS.blue, COLORS.green, COLORS.purple, COLORS.red, COLORS.slate][i % 6]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 by revenue */}
          {data.top10Revenue.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.topClients')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(280, data.top10Revenue.length * 36)}>
                  <BarChart data={data.top10Revenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} tickFormatter={(v) => fmtIQD(v)} />
                    <YAxis dataKey="name" type="category" width={160} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Bar dataKey="revenue" fill={COLORS.gold} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => navigate(`/clients/${d.id}`)} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Activity table */}
          <Card>
            <CardHeader><CardTitle className="text-heading-sm">{language === 'ar' ? 'نشاط العملاء' : 'Client Activity'}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'العميل' : 'Client'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="text-end">{language === 'ar' ? 'القضايا' : 'Cases'}</TableHead>
                      <TableHead className="text-end">{language === 'ar' ? 'المعاملات' : 'Errands'}</TableHead>
                      <TableHead className="text-end">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topClients.map((c: any) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${c.id}`)}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="capitalize">{c.type}</TableCell>
                        <TableCell className="text-end">{c.cases}</TableCell>
                        <TableCell className="text-end">{c.errands}</TableCell>
                        <TableCell className="text-end">{fmtIQD(c.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border"><CardContent className="p-4">
      <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-display-sm text-foreground">{value}</p>
    </CardContent></Card>
  );
}
