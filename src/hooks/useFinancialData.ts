import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDateRange, type DateRangePreset } from './useReportData';
import { format, differenceInCalendarDays } from 'date-fns';

export function useFinancialData(preset: DateRangePreset) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset), [preset]);
  const startStr = format(range.start, 'yyyy-MM-dd');
  const endStr = format(range.end, 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [invoicesRes, paymentsRes, allOutstandingRes, casesRes, timeRes] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, total_amount, amount_paid, balance_due, status, issue_date, due_date, currency, client_id, case_id')
        .eq('organization_id', orgId).gte('issue_date', startStr).lte('issue_date', endStr),
      supabase.from('payments').select('id, amount, payment_date, payment_method, invoice_id')
        .eq('organization_id', orgId).gte('payment_date', startStr).lte('payment_date', endStr),
      supabase.from('invoices').select('id, invoice_number, total_amount, amount_paid, balance_due, status, issue_date, due_date, client_id, case_id')
        .eq('organization_id', orgId).in('status', ['sent', 'viewed', 'partially_paid', 'overdue']),
      supabase.from('cases').select('id, billing_type, case_type, title')
        .eq('organization_id', orgId),
      supabase.from('time_entries').select('id, duration_minutes, is_billable, case_id')
        .eq('organization_id', orgId).eq('is_billable', true)
        .gte('entry_date', startStr).lte('entry_date', endStr),
    ]);

    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const outstanding = allOutstandingRes.data || [];
    const cases = casesRes.data || [];

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
    const totalCollected = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const totalOutstanding = outstanding.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
    
    const overdueInvoices = outstanding.filter((i: any) => {
      if (i.status === 'overdue') return true;
      return i.due_date && i.due_date < today;
    });
    const totalOverdue = overdueInvoices.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
    const avgInvoice = invoices.length > 0 ? Math.round(totalInvoiced / invoices.length) : 0;

    // Monthly revenue waterfall
    const monthMap: Record<string, { invoiced: number; collected: number; outstanding: number }> = {};
    invoices.forEach((i: any) => {
      const m = i.issue_date?.substring(0, 7);
      if (!m) return;
      if (!monthMap[m]) monthMap[m] = { invoiced: 0, collected: 0, outstanding: 0 };
      monthMap[m].invoiced += Number(i.total_amount || 0);
      monthMap[m].outstanding += Number(i.balance_due || 0);
    });
    payments.forEach((p: any) => {
      const m = p.payment_date?.substring(0, 7);
      if (!m) return;
      if (!monthMap[m]) monthMap[m] = { invoiced: 0, collected: 0, outstanding: 0 };
      monthMap[m].collected += Number(p.amount || 0);
    });
    const monthlyRevenue = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy'),
        ...v,
      }));

    // Revenue by client (top 10 from payments)
    const clientRevMap: Record<string, number> = {};
    // We need client names - get from invoices
    const clientIds = [...new Set(invoices.map((i: any) => i.client_id).filter(Boolean))];
    let clientNames: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from('clients').select('id, first_name, last_name, company_name')
        .in('id', clientIds.slice(0, 50));
      (clients || []).forEach((c: any) => {
        clientNames[c.id] = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
      });
    }
    invoices.forEach((i: any) => {
      if (i.client_id) {
        clientRevMap[i.client_id] = (clientRevMap[i.client_id] || 0) + Number(i.total_amount || 0);
      }
    });
    const revenueByClient = Object.entries(clientRevMap)
      .map(([clientId, amount]) => ({ clientId, name: clientNames[clientId] || clientId.substring(0, 8), amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Revenue by case type
    const caseTypeMap: Record<string, number> = {};
    const caseIdToType: Record<string, string> = {};
    cases.forEach((c: any) => { caseIdToType[c.id] = c.case_type; });
    invoices.forEach((i: any) => {
      const ct = i.case_id ? (caseIdToType[i.case_id] || 'other') : 'other';
      caseTypeMap[ct] = (caseTypeMap[ct] || 0) + Number(i.total_amount || 0);
    });
    const revenueByCaseType = Object.entries(caseTypeMap)
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Invoice aging
    const agingBuckets = { current: 0, days31_60: 0, days61_90: 0, days90plus: 0 };
    const agingCounts = { current: 0, days31_60: 0, days61_90: 0, days90plus: 0 };
    outstanding.forEach((i: any) => {
      const age = differenceInCalendarDays(new Date(), new Date(i.due_date || i.issue_date));
      const bal = Number(i.balance_due || 0);
      if (age <= 30) { agingBuckets.current += bal; agingCounts.current++; }
      else if (age <= 60) { agingBuckets.days31_60 += bal; agingCounts.days31_60++; }
      else if (age <= 90) { agingBuckets.days61_90 += bal; agingCounts.days61_90++; }
      else { agingBuckets.days90plus += bal; agingCounts.days90plus++; }
    });

    // Payment methods
    const methodMap: Record<string, number> = {};
    payments.forEach((p: any) => {
      const m = p.payment_method || 'other';
      methodMap[m] = (methodMap[m] || 0) + Number(p.amount || 0);
    });
    const paymentMethods = Object.entries(methodMap)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Billing type distribution
    const billingTypeMap: Record<string, number> = {};
    cases.forEach((c: any) => {
      const bt = c.billing_type || 'hourly';
      billingTypeMap[bt] = (billingTypeMap[bt] || 0) + 1;
    });
    const billingTypes = Object.entries(billingTypeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Pro bono
    const proBonoCases = cases.filter((c: any) => c.billing_type === 'pro_bono');
    const proBonoHours = (timeRes.data || [])
      .filter((t: any) => {
        const caseData = cases.find((c: any) => c.id === t.case_id);
        return caseData?.billing_type === 'pro_bono';
      })
      .reduce((s: number, t: any) => s + Number(t.duration_minutes || 0), 0) / 60;

    setData({
      kpis: { totalInvoiced, totalCollected, totalOutstanding, totalOverdue, collectionRate, avgInvoice },
      monthlyRevenue,
      revenueByClient,
      revenueByCaseType,
      aging: {
        buckets: [
          { label: '0-30', amount: agingBuckets.current, count: agingCounts.current, color: 'hsl(142, 71%, 45%)' },
          { label: '31-60', amount: agingBuckets.days31_60, count: agingCounts.days31_60, color: 'hsl(42, 50%, 54%)' },
          { label: '61-90', amount: agingBuckets.days61_90, count: agingCounts.days61_90, color: 'hsl(24, 95%, 53%)' },
          { label: '90+', amount: agingBuckets.days90plus, count: agingCounts.days90plus, color: 'hsl(0, 84%, 60%)' },
        ],
      },
      paymentMethods,
      billingTypes,
      outstandingInvoices: outstanding.map((i: any) => ({
        ...i,
        clientName: clientNames[i.client_id] || '-',
        age: differenceInCalendarDays(new Date(), new Date(i.due_date || i.issue_date)),
      })).sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || '')),
      proBono: {
        cases: proBonoCases.length,
        hours: Math.round(proBonoHours),
      },
    });
    setLoading(false);
  }, [profile?.organization_id, startStr, endStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, range };
}
