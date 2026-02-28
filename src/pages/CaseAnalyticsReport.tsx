import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDateRange, type DateRangePreset } from '@/hooks/useReportData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  blue: 'hsl(217, 91%, 60%)', green: 'hsl(142, 71%, 45%)', gold: 'hsl(42, 50%, 54%)',
  red: 'hsl(0, 84%, 60%)', amber: 'hsl(38, 92%, 50%)', purple: 'hsl(262, 52%, 47%)',
  slate: 'hsl(215, 16%, 47%)',
};

const STATUS_COLORS: Record<string, string> = {
  intake: COLORS.blue, active: COLORS.green, pending: COLORS.amber,
  won: 'hsl(142, 71%, 45%)', lost: COLORS.red, settled: COLORS.amber,
  closed: COLORS.slate, archived: 'hsl(215, 16%, 67%)',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: COLORS.green, medium: COLORS.blue, high: COLORS.amber, urgent: COLORS.red,
};

const DURATION_BUCKETS = ['0-30', '31-60', '61-90', '91-180', '181-365', '365+'];
const DURATION_COLORS = [COLORS.green, 'hsl(142, 50%, 55%)', COLORS.amber, 'hsl(25, 80%, 55%)', COLORS.red, 'hsl(0, 60%, 40%)'];

export default function CaseAnalyticsReport() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>('this_year');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset), [preset]);

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const startStr = format(range.start, 'yyyy-MM-dd');
    const endStr = format(range.end, 'yyyy-MM-dd');

    const [casesRes, closedRes] = await Promise.all([
      supabase.from('cases').select('id, status, case_type, priority, court_type, estimated_value, created_at, closed_at, outcome_date, filing_date').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
      supabase.from('cases').select('id, status, case_type, estimated_value, created_at, closed_at, outcome_date').eq('organization_id', orgId).in('status', ['won', 'lost', 'settled', 'closed']),
    ]);

    const cases = casesRes.data || [];
    const allClosed = closedRes.data || [];

    // KPIs
    const totalCases = cases.length;
    const activeStatuses = ['intake', 'active', 'pending', 'discovery', 'trial', 'appeal'];
    const activeCases = cases.filter(c => activeStatuses.includes(c.status)).length;
    const closedInPeriod = cases.filter(c => ['won', 'lost', 'settled', 'closed'].includes(c.status)).length;
    const won = cases.filter(c => c.status === 'won').length;
    const lost = cases.filter(c => c.status === 'lost').length;
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : null;

    // Avg duration for closed cases
    const closedWithDates = allClosed.filter(c => c.created_at && (c.outcome_date || c.closed_at));
    const durations = closedWithDates.map(c => {
      const end = new Date(c.outcome_date || c.closed_at);
      const start = new Date(c.created_at);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }).filter(d => d > 0);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

    // By status
    const byStatus: Record<string, { count: number; totalValue: number; durations: number[] }> = {};
    cases.forEach(c => {
      if (!byStatus[c.status]) byStatus[c.status] = { count: 0, totalValue: 0, durations: [] };
      byStatus[c.status].count++;
      byStatus[c.status].totalValue += Number(c.estimated_value || 0);
      if (c.closed_at && c.created_at) {
        const d = Math.round((new Date(c.closed_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (d > 0) byStatus[c.status].durations.push(d);
      }
    });

    // By type
    const byType: Record<string, number> = {};
    cases.forEach(c => { byType[c.case_type] = (byType[c.case_type] || 0) + 1; });

    // By court type
    const byCourtType: Record<string, number> = {};
    cases.forEach(c => { if (c.court_type) byCourtType[c.court_type] = (byCourtType[c.court_type] || 0) + 1; });

    // By priority
    const byPriority: Record<string, number> = {};
    cases.forEach(c => { byPriority[c.priority] = (byPriority[c.priority] || 0) + 1; });

    // Monthly trend
    const monthly: Record<string, { opened: number; won: number; lost: number; settled: number; closed: number }> = {};
    cases.forEach(c => {
      const m = c.created_at?.substring(0, 7);
      if (!monthly[m]) monthly[m] = { opened: 0, won: 0, lost: 0, settled: 0, closed: 0 };
      monthly[m].opened++;
      if (['won', 'lost', 'settled', 'closed'].includes(c.status)) {
        monthly[m][c.status as 'won' | 'lost' | 'settled' | 'closed']++;
      }
    });

    // Duration distribution
    const durationDist = DURATION_BUCKETS.map(() => 0);
    durations.forEach(d => {
      if (d <= 30) durationDist[0]++;
      else if (d <= 60) durationDist[1]++;
      else if (d <= 90) durationDist[2]++;
      else if (d <= 180) durationDist[3]++;
      else if (d <= 365) durationDist[4]++;
      else durationDist[5]++;
    });

    setData({
      totalCases, activeCases, closedInPeriod, winRate, avgDuration,
      byStatus: Object.entries(byStatus).map(([s, v]) => ({
        status: s, ...v, avgDuration: v.durations.length > 0 ? Math.round(v.durations.reduce((a, b) => a + b, 0) / v.durations.length) : null,
        avgValue: v.count > 0 ? Math.round(v.totalValue / v.count) : 0,
      })),
      byType: Object.entries(byType).map(([t, c]) => ({ type: t, count: c })).sort((a, b) => b.count - a.count),
      byCourtType: Object.entries(byCourtType).map(([t, c]) => ({ type: t, count: c })).sort((a, b) => b.count - a.count),
      byPriority: Object.entries(byPriority).map(([p, c]) => ({ priority: p, count: c })),
      monthlyTrend: Object.entries(monthly).sort().map(([m, v]) => ({ month: m, ...v })),
      durationDist: DURATION_BUCKETS.map((b, i) => ({ bucket: language === 'ar' ? b.replace('-', '–') + ' يوم' : b + ' days', count: durationDist[i] })),
    });
    setLoading(false);
  }, [profile?.organization_id, range, language]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'last_month', label: t('reports.lastMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
    { value: 'all_time', label: t('reports.allTime') },
  ];

  const fmtIQD = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M IQD` : `${v.toLocaleString()} IQD`;

  return (
    <div className="print:p-0">
      <PageHeader
        title="Case Analytics" titleAr="تحليلات القضايا"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Case Analytics', labelAr: 'تحليلات القضايا' },
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
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <KPI label={language === 'ar' ? 'إجمالي القضايا' : 'Total Cases'} value={data.totalCases} />
            <KPI label={language === 'ar' ? 'القضايا النشطة' : 'Active Cases'} value={data.activeCases} />
            <KPI label={language === 'ar' ? 'القضايا المغلقة' : 'Closed Cases'} value={data.closedInPeriod} />
            <KPI label={language === 'ar' ? 'نسبة الفوز' : 'Win Rate'} value={data.winRate !== null ? `${data.winRate}%` : '—'} />
            <KPI label={language === 'ar' ? 'متوسط المدة' : 'Avg Duration'} value={data.avgDuration !== null ? `${data.avgDuration} ${language === 'ar' ? 'يوم' : 'days'}` : '—'} />
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.casesByStatus')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="status" paddingAngle={2}>
                      {data.byStatus.map((s: any, i: number) => <Cell key={i} fill={STATUS_COLORS[s.status] || COLORS.slate} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.casesByType')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.byType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis dataKey="type" type="category" width={120} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 12 }} />
                    <Tooltip /><Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.caseTrend')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip /><Legend />
                    <Area type="monotone" dataKey="opened" name={language === 'ar' ? 'مفتوحة' : 'Opened'} stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'توزيع مدة القضايا' : 'Case Duration Distribution'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.durationDist}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="bucket" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.durationDist.map((_: any, i: number) => <Cell key={i} fill={DURATION_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {data.byCourtType.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'القضايا حسب نوع المحكمة' : 'Cases by Court Type'}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byCourtType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                      <YAxis dataKey="type" type="category" width={120} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 12 }} />
                      <Tooltip /><Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'توزيع الأولوية' : 'Priority Distribution'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.byPriority} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" nameKey="priority" paddingAngle={2}>
                      {data.byPriority.map((p: any, i: number) => <Cell key={i} fill={PRIORITY_COLORS[p.priority] || COLORS.slate} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status Table */}
          <Card>
            <CardHeader><CardTitle className="text-heading-sm">{language === 'ar' ? 'تفاصيل حسب الحالة' : 'Status Breakdown'}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'العدد' : 'Count'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'متوسط المدة' : 'Avg Duration'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'متوسط القيمة' : 'Avg Value'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byStatus.map((s: any) => (
                    <TableRow key={s.status}>
                      <TableCell className="font-medium capitalize">{s.status}</TableCell>
                      <TableCell className="text-end">{s.count}</TableCell>
                      <TableCell className="text-end">{s.avgDuration ? `${s.avgDuration} ${language === 'ar' ? 'يوم' : 'days'}` : '—'}</TableCell>
                      <TableCell className="text-end">{fmtIQD(s.avgValue)}</TableCell>
                      <TableCell className="text-end">{fmtIQD(s.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
