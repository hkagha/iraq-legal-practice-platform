import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDateRange, type DateRangePreset } from '@/hooks/useReportData';
import { format, differenceInBusinessDays, eachDayOfInterval, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  gold: 'hsl(42, 50%, 54%)', slate: 'hsl(215, 16%, 47%)', green: 'hsl(142, 71%, 45%)',
  blue: 'hsl(217, 91%, 60%)', red: 'hsl(0, 84%, 60%)', amber: 'hsl(38, 92%, 50%)',
};

export default function TimeUtilizationReport() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset), [preset]);

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const startStr = format(range.start, 'yyyy-MM-dd');
    const endStr = format(range.end, 'yyyy-MM-dd');

    const [timeRes, profilesRes, casesRes] = await Promise.all([
      supabase.from('time_entries').select('id, duration_minutes, is_billable, date, user_id, case_id, errand_id, billing_rate').eq('organization_id', orgId).or('is_timer_running.eq.false,is_timer_running.is.null').gte('date', startStr).lte('date', endStr),
      supabase.from('profiles').select('id, first_name, last_name, role').eq('organization_id', orgId),
      supabase.from('cases').select('id, case_number, case_type').eq('organization_id', orgId),
    ]);

    const entries = timeRes.data || [];
    const profiles = profilesRes.data || [];
    const cases = casesRes.data || [];
    const caseMap = Object.fromEntries(cases.map(c => [c.id, c]));
    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

    const totalMinutes = entries.reduce((s: number, e: any) => s + Number(e.duration_minutes || 0), 0);
    const billableMinutes = entries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + Number(e.duration_minutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const billableHours = Math.round(billableMinutes / 60 * 10) / 10;
    const nonBillableHours = Math.round((totalMinutes - billableMinutes) / 60 * 10) / 10;

    const workingDays = Math.max(1, differenceInBusinessDays(range.end, range.start));
    const utilizationRate = Math.round((billableHours / (workingDays * 8 * profiles.length || 1)) * 100);

    const billableAmount = entries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + (Number(e.duration_minutes || 0) / 60) * Number(e.billing_rate || 0), 0);
    const revenuePerHour = billableHours > 0 ? Math.round(billableAmount / billableHours) : 0;

    // Daily heatmap
    const days = eachDayOfInterval({ start: range.start, end: new Date(Math.min(range.end.getTime(), Date.now())) });
    const dailyHours: Record<string, number> = {};
    entries.forEach((e: any) => {
      const d = e.date;
      dailyHours[d] = (dailyHours[d] || 0) + Number(e.duration_minutes || 0) / 60;
    });
    const heatmapData = days.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      return { date: key, dayOfWeek: getDay(d), hours: Math.round((dailyHours[key] || 0) * 10) / 10 };
    });

    // Monthly billable vs non-billable
    const monthlyTime: Record<string, { billable: number; nonBillable: number }> = {};
    entries.forEach((e: any) => {
      const m = e.date?.substring(0, 7);
      if (!monthlyTime[m]) monthlyTime[m] = { billable: 0, nonBillable: 0 };
      const hrs = Number(e.duration_minutes || 0) / 60;
      if (e.is_billable) monthlyTime[m].billable += hrs;
      else monthlyTime[m].nonBillable += hrs;
    });

    // Hours by case
    const caseHours: Record<string, number> = {};
    entries.forEach((e: any) => {
      const key = e.case_id || e.errand_id || 'unlinked';
      caseHours[key] = (caseHours[key] || 0) + Number(e.duration_minutes || 0) / 60;
    });
    const topEntities = Object.entries(caseHours)
      .map(([id, hrs]) => ({ id, label: caseMap[id]?.case_number || (id === 'unlinked' ? (language === 'ar' ? 'غير مرتبط' : 'Unlinked') : id.substring(0, 8)), hours: Math.round(hrs * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    // Team utilization
    const memberData = profiles.map(p => {
      const memberEntries = entries.filter((e: any) => e.user_id === p.id);
      const mTotal = memberEntries.reduce((s: number, e: any) => s + Number(e.duration_minutes || 0), 0) / 60;
      const mBillable = memberEntries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + Number(e.duration_minutes || 0), 0) / 60;
      const mRevenue = memberEntries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + (Number(e.duration_minutes || 0) / 60) * Number(e.billing_rate || 0), 0);
      const util = Math.round((mBillable / (workingDays * 8 || 1)) * 100);
      return {
        id: p.id, name: `${p.first_name} ${p.last_name}`, role: p.role,
        totalHours: Math.round(mTotal * 10) / 10, billableHours: Math.round(mBillable * 10) / 10,
        nonBillableHours: Math.round((mTotal - mBillable) * 10) / 10,
        utilization: util, revenue: Math.round(mRevenue),
        avgRate: mBillable > 0 ? Math.round(mRevenue / mBillable) : 0,
      };
    }).filter(m => m.totalHours > 0).sort((a, b) => b.totalHours - a.totalHours);

    setData({
      totalHours, billableHours, nonBillableHours, utilizationRate, revenuePerHour,
      heatmapData,
      monthlyTrend: Object.entries(monthlyTime).sort().map(([m, v]) => ({ month: m, billable: Math.round(v.billable), nonBillable: Math.round(v.nonBillable) })),
      topEntities,
      memberData,
    });
    setLoading(false);
  }, [profile?.organization_id, range, language]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'last_month', label: t('reports.lastMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
  ];

  const heatColor = (hours: number) => {
    if (hours === 0) return 'bg-muted';
    if (hours < 3) return 'bg-accent/20';
    if (hours < 6) return 'bg-accent/40';
    if (hours < 8) return 'bg-accent/70';
    return 'bg-accent';
  };

  return (
    <div className="print:p-0">
      <PageHeader
        title="Time Utilization" titleAr="استخدام الوقت"
        helpKey="reports.time-utilization"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Time Utilization', labelAr: 'استخدام الوقت' },
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
            <KPI label={language === 'ar' ? 'إجمالي الساعات' : 'Total Hours'} value={`${data.totalHours}h`} />
            <KPI label={language === 'ar' ? 'ساعات قابلة للفوترة' : 'Billable Hours'} value={`${data.billableHours}h`} />
            <KPI label={language === 'ar' ? 'غير قابلة للفوترة' : 'Non-Billable'} value={`${data.nonBillableHours}h`} />
            <KPI label={language === 'ar' ? 'نسبة الاستخدام' : 'Utilization Rate'} value={`${data.utilizationRate}%`} color={data.utilizationRate >= 75 ? 'text-success' : data.utilizationRate >= 50 ? 'text-warning' : 'text-destructive'} />
            <KPI label={language === 'ar' ? 'إيراد/ساعة' : 'Revenue/Hour'} value={`${data.revenuePerHour.toLocaleString()} IQD`} />
          </div>

          {/* Heatmap */}
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'خريطة الساعات اليومية' : 'Daily Hours Heatmap'}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {data.heatmapData.map((d: any) => (
                  <div key={d.date} className={cn('w-4 h-4 rounded-sm', heatColor(d.hours))} title={`${d.date}: ${d.hours}h`} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-body-sm text-muted-foreground">
                <span>{language === 'ar' ? 'أقل' : 'Less'}</span>
                <div className="w-4 h-4 rounded-sm bg-muted" />
                <div className="w-4 h-4 rounded-sm bg-accent/20" />
                <div className="w-4 h-4 rounded-sm bg-accent/40" />
                <div className="w-4 h-4 rounded-sm bg-accent/70" />
                <div className="w-4 h-4 rounded-sm bg-accent" />
                <span>{language === 'ar' ? 'أكثر' : 'More'}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{t('reports.charts.billableVsNonBillable')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                    <Tooltip /><Legend />
                    <Area type="monotone" dataKey="billable" name={language === 'ar' ? 'قابل للفوترة' : 'Billable'} stackId="1" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="nonBillable" name={language === 'ar' ? 'غير قابل' : 'Non-Billable'} stackId="1" stroke={COLORS.slate} fill={COLORS.slate} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'الساعات حسب القضية' : 'Hours by Case/Errand'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.topEntities} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="hours" nameKey="label" paddingAngle={2}>
                      {data.topEntities.map((_: any, i: number) => <Cell key={i} fill={[COLORS.gold, COLORS.blue, COLORS.green, COLORS.amber, COLORS.slate, 'hsl(262,52%,47%)', 'hsl(0,84%,60%)', 'hsl(200,70%,50%)', 'hsl(30,80%,50%)', 'hsl(280,50%,50%)'][i % 10]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Team table */}
          {data.memberData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-heading-sm">{language === 'ar' ? 'استخدام الفريق' : 'Team Utilization'}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'العضو' : 'Member'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'إجمالي' : 'Total'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'قابل' : 'Billable'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'غير قابل' : 'Non-Bill.'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'الاستخدام' : 'Util.'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'متوسط السعر' : 'Avg Rate'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.memberData.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-end">{m.totalHours}h</TableCell>
                          <TableCell className="text-end">{m.billableHours}h</TableCell>
                          <TableCell className="text-end">{m.nonBillableHours}h</TableCell>
                          <TableCell className="text-end">
                            <span className={cn('font-medium', m.utilization >= 75 ? 'text-success' : m.utilization >= 50 ? 'text-warning' : 'text-destructive')}>
                              {m.utilization}%
                            </span>
                          </TableCell>
                          <TableCell className="text-end">{m.revenue.toLocaleString()} IQD</TableCell>
                          <TableCell className="text-end">{m.avgRate.toLocaleString()} IQD</TableCell>
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

function KPI({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="border"><CardContent className="p-4">
      <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-display-sm', color || 'text-foreground')}>{value}</p>
    </CardContent></Card>
  );
}
