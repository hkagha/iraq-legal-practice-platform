import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getDateRange, type DateRangePreset } from '@/hooks/useReportData';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Download, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  green: 'hsl(142, 71%, 45%)', amber: 'hsl(38, 92%, 50%)',
  orange: 'hsl(25, 95%, 53%)', red: 'hsl(0, 84%, 60%)',
  gold: 'hsl(42, 50%, 54%)', slate: 'hsl(215, 16%, 47%)',
  blue: 'hsl(217, 91%, 60%)',
};

const AGING_GROUPS = [
  { key: 'current', label: { en: 'Current (0-30 days)', ar: 'حالي (٠-٣٠ يوم)' }, color: COLORS.green, colorClass: 'text-success', min: 0, max: 30 },
  { key: '31-60', label: { en: '31-60 days', ar: '٣١-٦٠ يوم' }, color: COLORS.amber, colorClass: 'text-warning', min: 31, max: 60 },
  { key: '61-90', label: { en: '61-90 days', ar: '٦١-٩٠ يوم' }, color: COLORS.orange, colorClass: 'text-orange-500', min: 61, max: 90 },
  { key: '90+', label: { en: '90+ days', ar: '٩٠+ يوم' }, color: COLORS.red, colorClass: 'text-destructive', min: 91, max: Infinity },
];

export default function BillingAgingReport() {
  const { t, language } = useLanguage();
  const { profile, isRole } = useAuth();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DateRangePreset>('this_year');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [writeOffId, setWriteOffId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ '90+': true });

  const range = useMemo(() => getDateRange(preset), [preset]);
  const isAdmin = isRole('firm_admin');

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const startStr = format(range.start, 'yyyy-MM-dd');
    const endStr = format(range.end, 'yyyy-MM-dd');
    const today = new Date();

    const [invoicesRes, paymentsRes, clientsRes, casesRes] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, case_id, client_id, total_amount, amount_paid, status, issue_date, due_date, currency').eq('organization_id', orgId),
      supabase.from('payments').select('id, amount, payment_date, payment_method, invoice_id').eq('organization_id', orgId).gte('payment_date', startStr).lte('payment_date', endStr),
      supabase.from('clients').select('id, first_name, last_name, company_name, client_type').eq('organization_id', orgId),
      supabase.from('cases').select('id, case_number, title').eq('organization_id', orgId),
    ]);

    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const clients = clientsRes.data || [];
    const cases = casesRes.data || [];
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.client_type === 'company' ? c.company_name : `${c.first_name} ${c.last_name}`]));
    const caseMap = Object.fromEntries(cases.map(c => [c.id, c.case_number || c.title]));

    // Outstanding invoices
    const outstanding = invoices.filter(i => !['paid', 'cancelled', 'written_off', 'draft'].includes(i.status)).map(inv => {
      const balance = Number(inv.total_amount || 0) - Number(inv.amount_paid || 0);
      const age = differenceInDays(today, new Date(inv.due_date || inv.issue_date));
      return { ...inv, balance, age: Math.max(0, age), clientName: clientMap[inv.client_id] || '—', caseName: caseMap[inv.case_id] || '—' };
    });

    const totalOutstanding = outstanding.reduce((s, i) => s + i.balance, 0);
    const current = outstanding.filter(i => i.age <= 30).reduce((s, i) => s + i.balance, 0);
    const overdue31_90 = outstanding.filter(i => i.age > 30 && i.age <= 90).reduce((s, i) => s + i.balance, 0);
    const severe = outstanding.filter(i => i.age > 90).reduce((s, i) => s + i.balance, 0);

    // Invoiced & collected in period
    const periodInvoices = invoices.filter(i => i.issue_date >= startStr && i.issue_date <= endStr);
    const totalInvoiced = periodInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // Aging chart data
    const agingChart = AGING_GROUPS.map(g => ({
      ...g,
      count: outstanding.filter(i => i.age >= g.min && i.age <= g.max).length,
      amount: outstanding.filter(i => i.age >= g.min && i.age <= g.max).reduce((s, i) => s + i.balance, 0),
    }));

    // Group invoices for detail
    const groupedInvoices: Record<string, any[]> = {};
    AGING_GROUPS.forEach(g => {
      groupedInvoices[g.key] = outstanding.filter(i => i.age >= g.min && i.age <= g.max).sort((a, b) => a.due_date?.localeCompare(b.due_date || '') || 0);
    });

    // Days to payment distribution
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const paymentDays: number[] = [];
    paidInvoices.forEach(inv => {
      const invPayments = payments.filter(p => p.invoice_id === inv.id);
      if (invPayments.length > 0) {
        const lastPayment = invPayments.sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0];
        const days = differenceInDays(new Date(lastPayment.payment_date), new Date(inv.issue_date));
        if (days >= 0) paymentDays.push(days);
      }
    });
    const paymentBuckets = [
      { bucket: '0-15', count: paymentDays.filter(d => d <= 15).length },
      { bucket: '16-30', count: paymentDays.filter(d => d > 15 && d <= 30).length },
      { bucket: '31-45', count: paymentDays.filter(d => d > 30 && d <= 45).length },
      { bucket: '46-60', count: paymentDays.filter(d => d > 45 && d <= 60).length },
      { bucket: '60+', count: paymentDays.filter(d => d > 60).length },
    ];

    setData({
      totalOutstanding, current, overdue31_90, severe, collectionRate,
      agingChart, groupedInvoices, paymentBuckets,
    });
    setLoading(false);
  }, [profile?.organization_id, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWriteOff = async () => {
    if (!writeOffId) return;
    await supabase.from('invoices').update({ status: 'cancelled' } as any).eq('id', writeOffId);
    toast({ title: language === 'ar' ? 'تم شطب الفاتورة' : 'Invoice written off' });
    setWriteOffId(null);
    fetchData();
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle size={48} className="text-warning" />
        <p className="text-heading-sm text-foreground">{language === 'ar' ? 'ليس لديك صلاحية الوصول لهذا التقرير' : "You don't have access to this report"}</p>
        <Button variant="outline" onClick={() => navigate('/reports')}>{language === 'ar' ? 'العودة' : 'Back'}</Button>
      </div>
    );
  }

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
        title="Billing & Aging" titleAr="الفوترة والتقادم"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Billing & Aging', labelAr: 'الفوترة والتقادم' },
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
            <KPI label={language === 'ar' ? 'إجمالي المستحق' : 'Total Outstanding'} value={fmtIQD(data.totalOutstanding)} />
            <KPI label={language === 'ar' ? 'حالي (٠-٣٠)' : 'Current (0-30)'} value={fmtIQD(data.current)} color="text-success" />
            <KPI label={language === 'ar' ? 'متأخر (٣١-٩٠)' : 'Overdue (31-90)'} value={fmtIQD(data.overdue31_90)} color="text-warning" />
            <KPI label={language === 'ar' ? 'متأخر جداً (٩٠+)' : 'Severe (90+)'} value={fmtIQD(data.severe)} color="text-destructive" />
          </div>

          {/* Aging chart */}
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'تقادم الفواتير' : 'Invoice Aging'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.agingChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey={(d: any) => language === 'ar' ? d.label.ar : d.label.en} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                  <Tooltip formatter={(v: number, name: string) => [name === 'amount' ? fmtIQD(v) : v, name === 'amount' ? (language === 'ar' ? 'المبلغ' : 'Amount') : (language === 'ar' ? 'العدد' : 'Count')]} />
                  <Legend />
                  <Bar dataKey="count" name={language === 'ar' ? 'عدد الفواتير' : 'Invoice Count'} radius={[4, 4, 0, 0]}>
                    {data.agingChart.map((g: any, i: number) => <Cell key={i} fill={g.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Collection rate gauge */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'كفاءة التحصيل' : 'Collection Efficiency'}</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
                <div className={cn('text-[3rem] font-bold', data.collectionRate >= 80 ? 'text-success' : data.collectionRate >= 60 ? 'text-warning' : 'text-destructive')}>
                  {data.collectionRate}%
                </div>
                <p className="text-body-sm text-muted-foreground mt-1">{language === 'ar' ? 'نسبة التحصيل' : 'Collection Rate'}</p>
              </CardContent>
            </Card>
            {/* Days to payment */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'أيام الدفع' : 'Days to Payment'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.paymentBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="bucket" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip /><Bar dataKey="count" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Aging detail groups */}
          <div className="space-y-3">
            {AGING_GROUPS.map(group => {
              const invoices = data.groupedInvoices[group.key] || [];
              if (invoices.length === 0) return null;
              const groupTotal = invoices.reduce((s: number, i: any) => s + i.balance, 0);
              const isOpen = openGroups[group.key] ?? false;

              return (
                <Card key={group.key}>
                  <Collapsible open={isOpen} onOpenChange={(o) => setOpenGroups(prev => ({ ...prev, [group.key]: o }))}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="py-3 cursor-pointer hover:bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span className={cn('font-semibold', group.colorClass)}>{language === 'ar' ? group.label.ar : group.label.en}</span>
                            <span className="text-body-sm text-muted-foreground">({invoices.length} {language === 'ar' ? 'فاتورة' : 'invoices'})</span>
                          </div>
                          <span className={cn('font-semibold', group.colorClass)}>{fmtIQD(groupTotal)}</span>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{language === 'ar' ? 'العميل' : 'Client'}</TableHead>
                                <TableHead>{language === 'ar' ? 'القضية' : 'Case'}</TableHead>
                                <TableHead className="text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                                <TableHead className="text-end">{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                                <TableHead className="text-end">{language === 'ar' ? 'المتبقي' : 'Balance'}</TableHead>
                                <TableHead className="text-end">{language === 'ar' ? 'العمر' : 'Age'}</TableHead>
                                {group.key === '90+' && <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices.map((inv: any) => (
                                <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/billing/${inv.id}`)}>
                                  <TableCell className="font-mono text-body-sm">{inv.invoice_number}</TableCell>
                                  <TableCell>{inv.clientName}</TableCell>
                                  <TableCell>{inv.caseName}</TableCell>
                                  <TableCell className="text-end">{Number(inv.total_amount).toLocaleString()}</TableCell>
                                  <TableCell className="text-end">{Number(inv.amount_paid || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-end font-medium">{inv.balance.toLocaleString()}</TableCell>
                                  <TableCell className={cn('text-end font-medium', group.colorClass)}>{inv.age} {language === 'ar' ? 'يوم' : 'd'}</TableCell>
                                  {group.key === '90+' && (
                                    <TableCell>
                                      <Button size="sm" variant="destructive" className="text-xs" onClick={(e) => { e.stopPropagation(); setWriteOffId(inv.id); }}>
                                        {language === 'ar' ? 'شطب' : 'Write Off'}
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!writeOffId}
        onClose={() => setWriteOffId(null)}
        title="Write Off Invoice"
        titleAr="شطب الفاتورة"
        message="Are you sure you want to write off this invoice? This action cannot be undone."
        messageAr="هل أنت متأكد من شطب هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="Write Off"
        confirmLabelAr="شطب"
        type="danger"
        onConfirm={handleWriteOff}
      />
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="border"><CardContent className="p-4">
      <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-display-sm', color || 'text-foreground')}>{value}</p>
    </CardContent></Card>
  );
}
