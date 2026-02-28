import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears, format } from 'date-fns';

export type DateRangePreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'all_time' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRange(preset: DateRangePreset, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();
  switch (preset) {
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case 'this_quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'last_quarter': return { start: startOfQuarter(subQuarters(now, 1)), end: endOfQuarter(subQuarters(now, 1)) };
    case 'this_year': return { start: startOfYear(now), end: endOfYear(now) };
    case 'last_year': return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
    case 'all_time': return { start: new Date('2020-01-01'), end: now };
    case 'custom': return { start: customStart || startOfMonth(now), end: customEnd || endOfMonth(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function getPreviousPeriodRange(range: DateRange): DateRange {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - duration),
    end: new Date(range.start.getTime() - 1),
  };
}

export function useFirmPerformanceData(preset: DateRangePreset, customStart?: Date, customEnd?: Date) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const prevRange = useMemo(() => getPreviousPeriodRange(range), [range]);

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const startStr = format(range.start, 'yyyy-MM-dd');
    const endStr = format(range.end, 'yyyy-MM-dd');
    const prevStartStr = format(prevRange.start, 'yyyy-MM-dd');
    const prevEndStr = format(prevRange.end, 'yyyy-MM-dd');

    try {
      // Parallel queries
      const [
        casesRes, prevCasesRes,
        closedCasesRes, prevClosedCasesRes,
        invoicesRes, prevInvoicesRes,
        paymentsRes, prevPaymentsRes,
        timeRes, prevTimeRes,
        tasksRes, prevTasksRes,
        errandsRes, prevErrandsRes,
        clientsRes, prevClientsRes,
        allCasesRes,
      ] = await Promise.all([
        // Current period cases
        supabase.from('cases').select('id, status, case_type, client_id, created_at').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
        // Previous period cases
        supabase.from('cases').select('id, status, case_type, client_id, created_at').eq('organization_id', orgId).gte('created_at', prevStartStr).lte('created_at', prevEndStr),
        // Current closed cases
        supabase.from('cases').select('id, status, closed_at').eq('organization_id', orgId).in('status', ['won', 'lost', 'settled', 'closed']).gte('closed_at', startStr).lte('closed_at', endStr),
        // Previous closed cases
        supabase.from('cases').select('id, status, closed_at').eq('organization_id', orgId).in('status', ['won', 'lost', 'settled', 'closed']).gte('closed_at', prevStartStr).lte('closed_at', prevEndStr),
        // Invoices
        supabase.from('invoices').select('id, total_amount, status, issue_date, currency').eq('organization_id', orgId).gte('issue_date', startStr).lte('issue_date', endStr),
        supabase.from('invoices').select('id, total_amount, status, issue_date').eq('organization_id', orgId).gte('issue_date', prevStartStr).lte('issue_date', prevEndStr),
        // Payments
        supabase.from('payments').select('id, amount, payment_date, invoice_id').eq('organization_id', orgId).gte('payment_date', startStr).lte('payment_date', endStr),
        supabase.from('payments').select('id, amount, payment_date').eq('organization_id', orgId).gte('payment_date', prevStartStr).lte('payment_date', prevEndStr),
        // Time entries
        supabase.from('time_entries').select('id, duration_minutes, is_billable, entry_date').eq('organization_id', orgId).gte('entry_date', startStr).lte('entry_date', endStr),
        supabase.from('time_entries').select('id, duration_minutes, is_billable, entry_date').eq('organization_id', orgId).gte('entry_date', prevStartStr).lte('entry_date', prevEndStr),
        // Tasks
        supabase.from('tasks').select('id, status, completed_at').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('tasks').select('id, status, completed_at').eq('organization_id', orgId).gte('created_at', prevStartStr).lte('created_at', prevEndStr),
        // Errands
        supabase.from('errands').select('id, status, completed_date, created_at').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('errands').select('id, status, completed_date, created_at').eq('organization_id', orgId).gte('created_at', prevStartStr).lte('created_at', prevEndStr),
        // Clients
        supabase.from('clients').select('id, created_at').eq('organization_id', orgId).gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('clients').select('id, created_at').eq('organization_id', orgId).gte('created_at', prevStartStr).lte('created_at', prevEndStr),
        // All active cases for active count
        supabase.from('cases').select('id, client_id').eq('organization_id', orgId).not('status', 'in', '("closed","archived")'),
      ]);

      const cases = casesRes.data || [];
      const prevCases = prevCasesRes.data || [];
      const closedCases = closedCasesRes.data || [];
      const prevClosedCases = prevClosedCasesRes.data || [];
      const invoices = invoicesRes.data || [];
      const prevInvoices = prevInvoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const prevPayments = prevPaymentsRes.data || [];
      const timeEntries = timeRes.data || [];
      const prevTimeEntries = prevTimeRes.data || [];
      const tasks = tasksRes.data || [];
      const prevTasks = prevTasksRes.data || [];
      const errands = errandsRes.data || [];
      const prevErrands = prevErrandsRes.data || [];
      const newClients = clientsRes.data || [];
      const prevNewClients = prevClientsRes.data || [];
      const allActiveCases = allCasesRes.data || [];

      // KPIs
      const activeCasesCount = allActiveCases.length;
      const wonCases = closedCases.filter(c => c.status === 'won').length;
      const lostCases = closedCases.filter(c => c.status === 'lost').length;
      const winRate = (wonCases + lostCases) > 0 ? Math.round((wonCases / (wonCases + lostCases)) * 100) : 0;
      const prevWonCases = prevClosedCases.filter(c => c.status === 'won').length;
      const prevLostCases = prevClosedCases.filter(c => c.status === 'lost').length;
      const prevWinRate = (prevWonCases + prevLostCases) > 0 ? Math.round((prevWonCases / (prevWonCases + prevLostCases)) * 100) : 0;

      const totalRevenue = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const prevTotalRevenue = prevPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const totalInvoiced = invoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
      const prevTotalInvoiced = prevInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);

      const billableHours = Math.round(timeEntries.filter((t: any) => t.is_billable).reduce((sum: number, t: any) => sum + Number(t.duration_minutes || 0), 0) / 60);
      const prevBillableHours = Math.round(prevTimeEntries.filter((t: any) => t.is_billable).reduce((sum: number, t: any) => sum + Number(t.duration_minutes || 0), 0) / 60);

      const activeClients = new Set(allActiveCases.map((c: any) => c.client_id)).size;

      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const prevCompletedTasks = prevTasks.filter((t: any) => t.status === 'completed').length;
      const completedErrands = errands.filter((e: any) => e.status === 'completed').length;
      const prevCompletedErrands = prevErrands.filter((e: any) => e.status === 'completed').length;

      // Monthly trend data (aggregate by month)
      const monthlyData = buildMonthlyTrend(range.start, range.end, cases, closedCases, invoices, payments, errands);

      // Cases by type
      const casesByType: Record<string, number> = {};
      cases.forEach((c: any) => { casesByType[c.case_type] = (casesByType[c.case_type] || 0) + 1; });

      // Task completion
      const totalTasks = tasks.length;
      const pendingTasks = totalTasks - completedTasks;

      setData({
        kpis: {
          activeCases: activeCasesCount,
          winRate, prevWinRate,
          revenue: totalRevenue, prevRevenue: prevTotalRevenue,
          billableHours, prevBillableHours,
          activeClients,
        },
        summary: {
          newCases: cases.length, prevNewCases: prevCases.length,
          closedCasesCount: closedCases.length, prevClosedCasesCount: prevClosedCases.length,
          newClientsCount: newClients.length, prevNewClientsCount: prevNewClients.length,
          totalInvoiced, prevTotalInvoiced,
          totalRevenue, prevTotalRevenue,
          billableHours, prevBillableHours,
          completedTasks, prevCompletedTasks,
          completedErrands, prevCompletedErrands,
        },
        monthlyData,
        casesByType: Object.entries(casesByType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        taskCompletion: { completed: completedTasks, pending: pendingTasks },
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, range, prevRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, range, prevRange, refetch: fetchData };
}

function buildMonthlyTrend(start: Date, end: Date, cases: any[], closedCases: any[], invoices: any[], payments: any[], errands: any[]) {
  const months: { month: string; opened: number; closed: number; invoiced: number; collected: number; errands: number }[] = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endDate) {
    const monthStr = format(current, 'yyyy-MM');
    const label = format(current, 'MMM yyyy');
    months.push({
      month: label,
      opened: cases.filter(c => c.created_at?.startsWith(monthStr)).length,
      closed: closedCases.filter(c => c.closed_at?.startsWith(monthStr)).length,
      invoiced: invoices.filter(i => i.issue_date?.startsWith(monthStr)).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0),
      collected: payments.filter(p => p.payment_date?.startsWith(monthStr)).reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
      errands: errands.filter(e => e.status === 'completed' && e.completed_date?.startsWith(monthStr)).length,
    });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return months;
}

export function useSavedReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const saveReport = async (report: { name: string; name_ar?: string; report_type: string; filters?: any; date_range_start?: string; date_range_end?: string }) => {
    if (!profile?.organization_id || !profile?.id) return;
    await supabase.from('saved_reports').insert({
      ...report,
      organization_id: profile.organization_id,
      created_by: profile.id,
    } as any);
    await fetchReports();
  };

  const deleteReport = async (id: string) => {
    await supabase.from('saved_reports').delete().eq('id', id);
    await fetchReports();
  };

  return { reports, loading, saveReport, deleteReport, refetch: fetchReports };
}
