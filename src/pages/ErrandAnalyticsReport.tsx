import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDateRange, type DateRangePreset } from '@/hooks/useReportData';
import { format, differenceInDays } from 'date-fns';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  purple: 'hsl(262, 52%, 47%)', green: 'hsl(142, 71%, 45%)', red: 'hsl(0, 84%, 60%)',
  amber: 'hsl(38, 92%, 50%)', blue: 'hsl(217, 91%, 60%)', slate: 'hsl(215, 16%, 47%)',
};

const STATUS_COLORS: Record<string, string> = {
  new: COLORS.blue, in_progress: COLORS.purple, pending_review: COLORS.amber,
  completed: COLORS.green, approved: 'hsl(142, 60%, 40%)', rejected: COLORS.red,
  cancelled: COLORS.slate, on_hold: 'hsl(215, 16%, 67%)',
};

export default function ErrandAnalyticsReport() {
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
    const today = format(new Date(), 'yyyy-MM-dd');

    const [errandsRes, stepsRes, profilesRes] = await Promise.all([
      supabase.from('errands').select('id, status, category, start_date, due_date, completed_date, total_steps, government_entity, assigned_to, title, errand_number, created_at').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
      supabase.from('errand_steps').select('id, errand_id, status, title').eq('organization_id', orgId),
      supabase.from('profiles').select('id, first_name, last_name').eq('organization_id', orgId),
    ]);

    const errands = errandsRes.data || [];
    const steps = stepsRes.data || [];
    const profiles = profilesRes.data || [];
    const profileMap = Object.fromEntries(profiles.map(p => [p.id, `${p.first_name} ${p.last_name}`]));

    const total = errands.length;
    const completed = errands.filter(e => e.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdue = errands.filter(e => e.due_date && e.due_date < today && !['completed', 'cancelled', 'approved', 'rejected'].includes(e.status)).length;

    const completedWithDates = errands.filter(e => e.start_date && e.completed_date);
    const avgDuration = completedWithDates.length > 0
      ? Math.round(completedWithDates.reduce((s, e) => s + differenceInDays(new Date(e.completed_date!), new Date(e.start_date!)), 0) / completedWithDates.length)
      : null;

    // By category
    const byCategory: Record<string, number> = {};
    errands.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + 1; });

    // By status
    const byStatus: Record<string, number> = {};
    errands.forEach(e => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });

    // Monthly completed
    const monthly: Record<string, number> = {};
    errands.filter(e => e.status === 'completed' && e.completed_date).forEach(e => {
      const m = e.completed_date!.substring(0, 7);
      monthly[m] = (monthly[m] || 0) + 1;
    });

    // Avg steps per category
    const catSteps: Record<string, { total: number; count: number }> = {};
    errands.forEach(e => {
      if (!catSteps[e.category]) catSteps[e.category] = { total: 0, count: 0 };
      catSteps[e.category].total += e.total_steps || 0;
      catSteps[e.category].count++;
    });

    // Gov entity distribution
    const byGovEntity: Record<string, number> = {};
    errands.forEach(e => { if (e.government_entity) byGovEntity[e.government_entity] = (byGovEntity[e.government_entity] || 0) + 1; });

    // Duration distribution
    const durBuckets = [0, 0, 0, 0, 0];
    completedWithDates.forEach(e => {
      const d = differenceInDays(new Date(e.completed_date!), new Date(e.start_date!));
      if (d <= 7) durBuckets[0]++;
      else if (d <= 14) durBuckets[1]++;
      else if (d <= 30) durBuckets[2]++;
      else if (d <= 60) durBuckets[3]++;
      else durBuckets[4]++;
    });

    // Bottleneck: stuck errands
    const stuckErrands = errands.filter(e => {
      if (['completed', 'cancelled', 'approved', 'rejected'].includes(e.status)) return false;
      const daysSinceCreated = differenceInDays(new Date(), new Date(e.created_at));
      return daysSinceCreated > 14;
    }).map(e => {
      const blockedStep = steps.find(s => s.errand_id === e.id && s.status === 'blocked');
      return {
        ...e,
        daysStuck: differenceInDays(new Date(), new Date(e.created_at)),
        blockedStep: blockedStep?.title || null,
        assignedName: e.assigned_to ? profileMap[e.assigned_to] || '—' : '—',
      };
    }).sort((a, b) => b.daysStuck - a.daysStuck).slice(0, 20);

    setData({
      total, completed, completionRate, overdue, avgDuration,
      byCategory: Object.entries(byCategory).map(([c, n]) => ({ category: c, count: n })).sort((a, b) => b.count - a.count).slice(0, 15),
      byStatus: Object.entries(byStatus).map(([s, n]) => ({ status: s, count: n })),
      monthlyCompleted: Object.entries(monthly).sort().map(([m, c]) => ({ month: m, count: c })),
      avgSteps: Object.entries(catSteps).map(([c, v]) => ({ category: c, avg: Math.round(v.total / v.count) })).sort((a, b) => b.avg - a.avg).slice(0, 10),
      byGovEntity: Object.entries(byGovEntity).map(([e, c]) => ({ entity: e, count: c })).sort((a, b) => b.count - a.count),
      durationDist: [
        { bucket: language === 'ar' ? '٠-٧ أيام' : '0-7 days', count: durBuckets[0] },
        { bucket: language === 'ar' ? '٨-١٤ يوم' : '8-14 days', count: durBuckets[1] },
        { bucket: language === 'ar' ? '١٥-٣٠ يوم' : '15-30 days', count: durBuckets[2] },
        { bucket: language === 'ar' ? '٣١-٦٠ يوم' : '31-60 days', count: durBuckets[3] },
        { bucket: language === 'ar' ? '٦٠+ يوم' : '60+ days', count: durBuckets[4] },
      ],
      stuckErrands,
    });
    setLoading(false);
  }, [profile?.organization_id, range, language]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
    { value: 'all_time', label: t('reports.allTime') },
  ];

  return (
    <div className="print:p-0">
      <PageHeader
        title="Errand Analytics" titleAr="تحليلات المعاملات"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Errand Analytics', labelAr: 'تحليلات المعاملات' },
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <KPI label={language === 'ar' ? 'إجمالي المعاملات' : 'Total Errands'} value={data.total} />
            <KPI label={language === 'ar' ? 'مكتملة' : 'Completed'} value={data.completed} />
            <KPI label={language === 'ar' ? 'نسبة الإكمال' : 'Completion Rate'} value={`${data.completionRate}%`} />
            <KPI label={language === 'ar' ? 'متوسط المدة' : 'Avg Duration'} value={data.avgDuration !== null ? `${data.avgDuration} ${language === 'ar' ? 'يوم' : 'days'}` : '—'} />
            <KPI label={language === 'ar' ? 'متأخرة' : 'Overdue'} value={data.overdue} highlight={data.overdue > 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.errandsByCategory')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(280, data.byCategory.length * 32)}>
                  <BarChart data={data.byCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis dataKey="category" type="category" width={140} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <Tooltip /><Bar dataKey="count" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.errandsByStatus')}</CardTitle></CardHeader>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.errandCompletionTrend')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthlyCompleted}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'متوسط الخطوات حسب التصنيف' : 'Avg Steps per Category'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.avgSteps}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="category" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip /><Bar dataKey="avg" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {data.byGovEntity.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'توزيع الجهات الحكومية' : 'Government Entity Distribution'}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byGovEntity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                      <YAxis dataKey="entity" type="category" width={160} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                      <Tooltip /><Bar dataKey="count" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'توزيع مدة المعاملات' : 'Errand Duration Distribution'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.durationDist}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="bucket" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip /><Bar dataKey="count" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Bottleneck table */}
          {data.stuckErrands.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-heading-sm">{language === 'ar' ? 'تحليل العقبات' : 'Bottleneck Analysis'}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التصنيف' : 'Category'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'أيام التأخير' : 'Days Stuck'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الخطوة المعلقة' : 'Blocked Step'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المسؤول' : 'Assigned To'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.stuckErrands.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-body-sm">{e.errand_number}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell className="capitalize">{e.status}</TableCell>
                          <TableCell className="text-end text-destructive font-medium">{e.daysStuck}</TableCell>
                          <TableCell>{e.blockedStep || '—'}</TableCell>
                          <TableCell>{e.assignedName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className="border"><CardContent className="p-4">
      <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-display-sm ${highlight ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
    </CardContent></Card>
  );
}
