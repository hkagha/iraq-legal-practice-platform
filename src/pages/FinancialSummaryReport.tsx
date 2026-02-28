import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFinancialData } from '@/hooks/useFinancialData';
import { type DateRangePreset } from '@/hooks/useReportData';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, FileSpreadsheet, ShieldAlert } from 'lucide-react';

const CHART_COLORS = ['hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(42,50%,54%)', 'hsl(262,52%,47%)', 'hsl(0,84%,60%)', 'hsl(38,92%,50%)', 'hsl(200,80%,50%)', 'hsl(280,60%,55%)'];

function formatIQD(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString();
}

function ageColor(age: number) {
  if (age <= 30) return 'text-success';
  if (age <= 60) return 'text-warning';
  if (age <= 90) return 'text-orange-500';
  return 'text-destructive';
}

export default function FinancialSummaryReport() {
  const { t, language } = useLanguage();
  const { isRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isRole('firm_admin');

  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const { data, loading } = useFinancialData(preset);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldAlert size={48} className="text-muted-foreground" />
        <p className="text-heading-md text-foreground">{language === 'ar' ? 'ليس لديك صلاحية لعرض هذا التقرير' : "You don't have access to this report"}</p>
        <Button variant="outline" onClick={() => navigate('/reports')}>{t('common.back')}</Button>
      </div>
    );
  }

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'last_month', label: t('reports.lastMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
    { value: 'all_time', label: t('reports.allTime') },
  ];

  const handleExportExcel = () => {
    if (!data) return;
    // Simple CSV export as xlsx alternative (no extra dependency)
    const rows = [
      ['Metric', 'Value'],
      ['Total Invoiced', data.kpis.totalInvoiced],
      ['Total Collected', data.kpis.totalCollected],
      ['Outstanding', data.kpis.totalOutstanding],
      ['Overdue', data.kpis.totalOverdue],
      ['Collection Rate', `${data.kpis.collectionRate}%`],
      ['Average Invoice', data.kpis.avgInvoice],
      [''],
      ['Invoice #', 'Client', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', 'Age (days)'],
      ...data.outstandingInvoices.map((i: any) => [
        i.invoice_number, i.clientName, i.total_amount, i.amount_paid, i.balance_due, i.status, i.due_date, i.age,
      ]),
    ];
    const csv = rows.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-summary-${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="print:p-0">
      <PageHeader
        title="Financial Summary"
        titleAr="الملخص المالي"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Financial Summary', labelAr: 'الملخص المالي' },
        ]}
        secondaryActions={[
          { label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() },
          { label: 'Export Excel', labelAr: 'تصدير Excel', icon: FileSpreadsheet, onClick: handleExportExcel },
        ]}
      />

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <KPI label={language === 'ar' ? 'إجمالي المفوتر' : 'Total Invoiced'} value={`${formatIQD(data.kpis.totalInvoiced)} IQD`} />
            <KPI label={language === 'ar' ? 'إجمالي المحصّل' : 'Total Collected'} value={`${formatIQD(data.kpis.totalCollected)} IQD`} />
            <KPI label={language === 'ar' ? 'المستحق' : 'Outstanding'} value={`${formatIQD(data.kpis.totalOutstanding)} IQD`} />
            <KPI label={language === 'ar' ? 'المتأخر' : 'Overdue'} value={`${formatIQD(data.kpis.totalOverdue)} IQD`} className="border-destructive/30" />
            <KPI label={language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate'} value={`${data.kpis.collectionRate}%`} />
            <KPI label={language === 'ar' ? 'متوسط الفاتورة' : 'Avg. Invoice'} value={`${formatIQD(data.kpis.avgInvoice)} IQD`} />
          </div>

          {/* Revenue Waterfall - Full Width */}
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} tickFormatter={(v) => formatIQD(v)} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                  <Legend />
                  <Bar dataKey="invoiced" name={language === 'ar' ? 'مفوتر' : 'Invoiced'} fill="hsl(217,91%,60%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="collected" name={language === 'ar' ? 'محصّل' : 'Collected'} fill="hsl(142,71%,45%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="outstanding" name={language === 'ar' ? 'مستحق' : 'Outstanding'} fill="hsl(38,92%,50%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'الإيرادات حسب العميل' : 'Revenue by Client'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.revenueByClient} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} tickFormatter={(v) => formatIQD(v)} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Bar dataKey="amount" fill="hsl(42,50%,54%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'الإيرادات حسب نوع القضية' : 'Revenue by Case Type'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.revenueByCaseType} dataKey="amount" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                      {data.revenueByCaseType.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'تقادم الفواتير' : 'Invoice Aging'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.aging.buckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} tickFormatter={(v) => formatIQD(v)} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Bar dataKey="amount" name={language === 'ar' ? 'المبلغ' : 'Amount'} radius={[4, 4, 0, 0]}>
                      {data.aging.buckets.map((b: any, i: number) => <Cell key={i} fill={b.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'طرق الدفع' : 'Payment Methods'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.paymentMethods} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                      {data.paymentMethods.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'توزيع نوع الفوترة' : 'Billing Type Distribution'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.billingTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100}>
                      {data.billingTypes.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'اتجاه التحصيل' : 'Collection Trend'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} tickFormatter={(v) => formatIQD(v)} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} IQD`} />
                    <Area type="monotone" dataKey="collected" name={language === 'ar' ? 'محصّل' : 'Collected'} stroke="hsl(142,71%,45%)" fill="hsl(142,71%,45%)" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Invoices Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-heading-sm">{language === 'ar' ? 'الفواتير المستحقة' : 'Outstanding Invoices'}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.outstandingInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{language === 'ar' ? 'لا توجد فواتير مستحقة' : 'No outstanding invoices'}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العميل' : 'Client'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'المبلغ' : 'Total'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العمر' : 'Age'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.outstandingInvoices.map((inv: any) => (
                        <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/billing/${inv.id}`)}>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.clientName}</TableCell>
                          <TableCell className="text-end">{Number(inv.total_amount).toLocaleString()}</TableCell>
                          <TableCell className="text-end">{Number(inv.amount_paid).toLocaleString()}</TableCell>
                          <TableCell className="text-end font-medium">{Number(inv.balance_due).toLocaleString()}</TableCell>
                          <TableCell>{inv.due_date || '-'}</TableCell>
                          <TableCell><span className={cn('font-medium', ageColor(inv.age))}>{inv.age}d</span></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{inv.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pro Bono Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm">{language === 'ar' ? 'ملخص القضايا المجانية' : 'Pro Bono Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'قضايا مجانية' : 'Pro Bono Cases'}</p>
                  <p className="text-display-sm text-foreground">{data.proBono.cases}</p>
                </div>
                <div className="text-center p-4">
                  <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'ساعات مجانية' : 'Pro Bono Hours'}</p>
                  <p className="text-display-sm text-foreground">{data.proBono.hours}h</p>
                </div>
                <div className="text-center p-4">
                  <p className="text-body-sm text-muted-foreground">{language === 'ar' ? 'القيمة التقديرية' : 'Estimated Value'}</p>
                  <p className="text-display-sm text-foreground">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className={cn('border', className)}>
      <CardContent className="p-4">
        <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-display-sm text-foreground leading-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
