import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFirmPerformanceData, useSavedReports, type DateRangePreset } from '@/hooks/useReportData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';

const COLORS = {
  blue: 'hsl(217, 91%, 60%)',
  green: 'hsl(142, 71%, 45%)',
  gold: 'hsl(42, 50%, 54%)',
  goldLight: 'hsl(42, 50%, 54%, 0.3)',
  purple: 'hsl(262, 52%, 47%)',
  red: 'hsl(0, 84%, 60%)',
  slate: 'hsl(215, 16%, 47%)',
};

function calcChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const change = calcChange(current, previous);
  const isPositive = change >= 0;
  return (
    <span className={cn('flex items-center gap-0.5 text-body-sm font-medium', isPositive ? 'text-success' : 'text-destructive')}>
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {isPositive ? '+' : ''}{change}%
    </span>
  );
}

function formatIQD(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString();
}

export default function FirmPerformanceReport() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const { data, loading, range } = useFirmPerformanceData(preset);
  const { saveReport } = useSavedReports();
  const [saveOpen, setSaveOpen] = useState(false);
  const [reportName, setReportName] = useState('');

  const handleSave = async () => {
    if (!reportName.trim()) return;
    await saveReport({
      name: reportName,
      report_type: 'firm_performance',
      date_range_start: format(range.start, 'yyyy-MM-dd'),
      date_range_end: format(range.end, 'yyyy-MM-dd'),
      filters: { preset },
    });
    toast({ title: language === 'ar' ? 'تم حفظ التقرير' : 'Report saved' });
    setSaveOpen(false);
    setReportName('');
  };

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'last_month', label: t('reports.lastMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'last_quarter', label: t('reports.lastQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
    { value: 'last_year', label: t('reports.lastYear') },
    { value: 'all_time', label: t('reports.allTime') },
  ];

  return (
    <div className="print:p-0">
      <PageHeader
        title="Firm Performance"
        titleAr="أداء المكتب"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Firm Performance', labelAr: 'أداء المكتب' },
        ]}
        secondaryActions={[
          { label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() },
          { label: 'Save Report', labelAr: 'حفظ التقرير', icon: Save, onClick: () => setSaveOpen(true) },
        ]}
      />

      {/* Date Range Selector */}
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <span className="text-body-sm text-muted-foreground">{t('reports.dateRange')}:</span>
        <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {presetOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">{t('reports.generating')}</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <KPICard label={language === 'ar' ? 'القضايا النشطة' : 'Active Cases'} value={data.kpis.activeCases} />
            <KPICard label={language === 'ar' ? 'نسبة الفوز' : 'Win Rate'} value={`${data.kpis.winRate}%`} trend={<TrendBadge current={data.kpis.winRate} previous={data.kpis.prevWinRate} />} />
            <KPICard label={language === 'ar' ? 'الإيرادات' : 'Revenue'} value={`${formatIQD(data.kpis.revenue)} IQD`} trend={<TrendBadge current={data.kpis.revenue} previous={data.kpis.prevRevenue} />} />
            <KPICard label={language === 'ar' ? 'ساعات قابلة للفوترة' : 'Billable Hours'} value={`${data.kpis.billableHours}h`} trend={<TrendBadge current={data.kpis.billableHours} previous={data.kpis.prevBillableHours} />} />
            <KPICard label={language === 'ar' ? 'عملاء نشطون' : 'Active Clients'} value={data.kpis.activeClients} />
          </div>

          {/* Chart Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-sm">{language === 'ar' ? 'اتجاه القضايا المفتوحة والمغلقة' : 'Cases Opened vs Closed'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-body-sm" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="opened" name={language === 'ar' ? 'مفتوحة' : 'Opened'} stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.1} />
                    <Area type="monotone" dataKey="closed" name={language === 'ar' ? 'مغلقة' : 'Closed'} stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-sm">{language === 'ar' ? 'اتجاه الإيرادات' : 'Revenue Trend'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} tickFormatter={(v) => formatIQD(v)} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Legend />
                    <Bar dataKey="invoiced" name={language === 'ar' ? 'مفوتر' : 'Invoiced'} fill={COLORS.goldLight} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="collected" name={language === 'ar' ? 'محصّل' : 'Collected'} stroke={COLORS.gold} strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Chart Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-sm">{language === 'ar' ? 'القضايا حسب النوع' : 'Cases by Type'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.casesByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis dataKey="type" type="category" width={120} tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-sm">{language === 'ar' ? 'إنجاز المهام' : 'Task Completion'}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: language === 'ar' ? 'مكتملة' : 'Completed', value: data.taskCompletion.completed },
                        { name: language === 'ar' ? 'معلقة' : 'Pending', value: data.taskCompletion.pending },
                      ]}
                      cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                      dataKey="value" paddingAngle={2}
                    >
                      <Cell fill={COLORS.green} />
                      <Cell fill={COLORS.slate} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Chart Row 3 - Errand trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-sm">{language === 'ar' ? 'اتجاه إكمال المعاملات' : 'Errand Completion Trend'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="errands" name={language === 'ar' ? 'معاملات مكتملة' : 'Completed Errands'} stroke={COLORS.purple} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm">{language === 'ar' ? 'ملخص المقارنة' : 'Period Comparison'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المؤشر' : 'Metric'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'هذه الفترة' : 'This Period'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'الفترة السابقة' : 'Previous Period'}</TableHead>
                    <TableHead className="text-end">{language === 'ar' ? 'التغيير' : 'Change'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: { en: 'New Cases', ar: 'قضايا جديدة' }, current: data.summary.newCases, prev: data.summary.prevNewCases },
                    { label: { en: 'Closed Cases', ar: 'قضايا مغلقة' }, current: data.summary.closedCasesCount, prev: data.summary.prevClosedCasesCount },
                    { label: { en: 'New Clients', ar: 'عملاء جدد' }, current: data.summary.newClientsCount, prev: data.summary.prevNewClientsCount },
                    { label: { en: 'Revenue Invoiced', ar: 'إيرادات مفوترة' }, current: data.summary.totalInvoiced, prev: data.summary.prevTotalInvoiced, isCurrency: true },
                    { label: { en: 'Revenue Collected', ar: 'إيرادات محصلة' }, current: data.summary.totalRevenue, prev: data.summary.prevTotalRevenue, isCurrency: true },
                    { label: { en: 'Billable Hours', ar: 'ساعات قابلة للفوترة' }, current: data.summary.billableHours, prev: data.summary.prevBillableHours, suffix: 'h' },
                    { label: { en: 'Tasks Completed', ar: 'مهام مكتملة' }, current: data.summary.completedTasks, prev: data.summary.prevCompletedTasks },
                    { label: { en: 'Errands Completed', ar: 'معاملات مكتملة' }, current: data.summary.completedErrands, prev: data.summary.prevCompletedErrands },
                  ].map((row, i) => {
                    const change = calcChange(row.current, row.prev);
                    const isPos = change >= 0;
                    const fmtVal = (v: number) => row.isCurrency ? `${v.toLocaleString()} IQD` : `${v}${row.suffix || ''}`;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{language === 'ar' ? row.label.ar : row.label.en}</TableCell>
                        <TableCell className="text-end">{fmtVal(row.current)}</TableCell>
                        <TableCell className="text-end text-muted-foreground">{fmtVal(row.prev)}</TableCell>
                        <TableCell className="text-end">
                          <span className={cn('font-medium', isPos ? 'text-success' : 'text-destructive')}>
                            {isPos ? '↑' : '↓'} {Math.abs(change)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Report Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reports.saveReport')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={language === 'ar' ? 'اسم التقرير' : 'Report name'}
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent-dark">{t('reports.saveReport')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPICard({ label, value, trend }: { label: string; value: string | number; trend?: React.ReactNode }) {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-display-sm text-foreground">{value}</p>
        {trend && <div className="mt-1">{trend}</div>}
      </CardContent>
    </Card>
  );
}
