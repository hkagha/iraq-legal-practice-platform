import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { Banknote, Receipt, AlertTriangle, CheckCircle, MoreHorizontal, Eye, Pencil, DollarSign, Send, XCircle, Copy } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export default function BillingPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, outstanding: 0, overdue: 0, paidThisMonth: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [cancelId, setCancelId] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchStats = useCallback(async () => {
    if (!orgId) return;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [revRes, outRes, overdueRes, paidRes] = await Promise.all([
      supabase.from('invoices').select('amount_paid').eq('organization_id', orgId).in('status', ['paid', 'partially_paid']),
      supabase.from('invoices').select('balance_due').eq('organization_id', orgId).in('status', ['sent', 'viewed', 'partially_paid']),
      supabase.from('invoices').select('balance_due').eq('organization_id', orgId).not('status', 'in', '("paid","cancelled","written_off","draft")').lt('due_date', today),
      supabase.from('payments').select('amount').eq('organization_id', orgId).gte('payment_date', monthStart),
    ]);

    setStats({
      totalRevenue: (revRes.data || []).reduce((s, r) => s + Number(r.amount_paid || 0), 0),
      outstanding: (outRes.data || []).reduce((s, r) => s + Number(r.balance_due || 0), 0),
      overdue: (overdueRes.data || []).reduce((s, r) => s + Number(r.balance_due || 0), 0),
      paidThisMonth: (paidRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
    });
  }, [orgId]);

  const fetchInvoices = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let query = supabase
      .from('invoices')
      .select('*, clients(first_name, last_name, company_name, client_type), cases(case_number, title)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (search) query = query.ilike('invoice_number', `%${search}%`);

    const { data } = await query;
    setInvoices(data || []);
    setLoading(false);
  }, [orgId, filters, search]);

  useEffect(() => { fetchStats(); fetchInvoices(); }, [fetchStats, fetchInvoices]);

  const formatAmount = (amount: number | null) => {
    const val = Number(amount || 0);
    return val.toLocaleString('en-US') + ' IQD';
  };

  const getClientName = (inv: any) => {
    const c = inv.clients;
    if (!c) return '—';
    if (c.client_type === 'company') return c.company_name || '—';
    return `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—';
  };

  const handleCancel = async () => {
    if (!cancelId || !orgId) return;
    // Revert linked time entries
    await supabase.from('time_entries').update({ status: 'approved', invoice_id: null } as any).eq('invoice_id', cancelId).eq('organization_id', orgId);
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', cancelId);
    toast({ title: t('billing.messages.invoiceCancelled') });
    setCancelId(null);
    fetchInvoices();
    fetchStats();
  };

  const handleDuplicate = async (inv: any) => {
    if (!orgId || !profile) return;
    const { data: newInv } = await supabase.from('invoices').insert({
      organization_id: orgId,
      client_id: inv.client_id,
      case_id: inv.case_id,
      currency: inv.currency,
      subtotal: inv.subtotal,
      tax_rate: inv.tax_rate,
      discount_amount: inv.discount_amount,
      discount_type: inv.discount_type,
      discount_percentage: inv.discount_percentage,
      notes: inv.notes,
      notes_ar: inv.notes_ar,
      terms: inv.terms,
      terms_ar: inv.terms_ar,
      footer_text: inv.footer_text,
      footer_text_ar: inv.footer_text_ar,
      created_by: profile.id,
      status: 'draft',
    } as any).select().single();

    if (newInv) {
      const { data: items } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', inv.id);
      if (items?.length) {
        await supabase.from('invoice_line_items').insert(items.map((item: any) => ({
          invoice_id: newInv.id,
          organization_id: orgId,
          description: item.description,
          description_ar: item.description_ar,
          line_type: item.line_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: item.sort_order,
        })));
      }
      toast({ title: t('billing.messages.invoiceDuplicated') });
      navigate(`/billing/${newInv.id}`);
    }
  };

  const handleSend = async (id: string) => {
    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id);
    toast({ title: t('billing.messages.invoiceSent') });
    fetchInvoices();
  };

  const statusFilterOptions = [
    { value: 'draft', label: 'Draft', labelAr: 'مسودة' },
    { value: 'sent', label: 'Sent', labelAr: 'مرسلة' },
    { value: 'viewed', label: 'Viewed', labelAr: 'تم الاطلاع' },
    { value: 'partially_paid', label: 'Partially Paid', labelAr: 'مدفوعة جزئياً' },
    { value: 'paid', label: 'Paid', labelAr: 'مدفوعة' },
    { value: 'overdue', label: 'Overdue', labelAr: 'متأخرة' },
    { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغاة' },
    { value: 'written_off', label: 'Written Off', labelAr: 'شُطبت' },
  ];

  return (
    <div>
      <PageHeader
        title={t('billing.title')}
        titleAr="الفواتير"
        subtitle={t('billing.subtitle')}
        subtitleAr="إدارة الفواتير والمدفوعات"
        actionLabel={t('billing.createInvoice')}
        actionLabelAr="إنشاء فاتورة"
        onAction={() => navigate('/billing/new')}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Billing', labelAr: 'الفواتير' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Banknote} iconColor="#22C55E" iconBgColor="#F0FDF4" label={t('billing.totalRevenue')} labelAr="إجمالي الإيرادات" value={formatAmount(stats.totalRevenue)} isLoading={loading} />
        <StatCard icon={Receipt} iconColor="#F59E0B" iconBgColor="#FFFBEB" label={t('billing.outstanding')} labelAr="مستحق" value={formatAmount(stats.outstanding)} isLoading={loading} />
        <StatCard icon={AlertTriangle} iconColor="#EF4444" iconBgColor="#FEF2F2" label={t('billing.overdue')} labelAr="متأخر" value={formatAmount(stats.overdue)} isLoading={loading} />
        <StatCard icon={CheckCircle} iconColor="#C9A84C" iconBgColor="#FFF8E1" label={t('billing.paidThisMonth')} labelAr="المدفوع هذا الشهر" value={formatAmount(stats.paidThisMonth)} isLoading={loading} />
      </div>

      <FilterBar
        searchPlaceholder="Search invoices..."
        searchPlaceholderAr="البحث في الفواتير..."
        onSearchChange={setSearch}
        filters={[
          { key: 'status', label: 'Status', labelAr: 'الحالة', options: statusFilterOptions },
        ]}
        activeFilters={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onClearAll={() => setFilters({})}
      />

      {!loading && invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t('billing.empty.title')}
          titleAr="لا توجد فواتير بعد"
          subtitle={t('billing.empty.subtitle')}
          subtitleAr="أنشئ أول فاتورة لبدء فوترة العملاء"
          actionLabel={t('billing.empty.action')}
          actionLabelAr="إنشاء أول فاتورة"
          onAction={() => navigate('/billing/new')}
          size="lg"
        />
      ) : (
        <div className="bg-card rounded-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.invoiceNumber')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.client')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.case')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.issueDate')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.dueDate')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.total')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.amountPaid')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('billing.invoice.balanceDue')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground p-3">{t('common.status')}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isOverdue = inv.due_date && isBefore(new Date(inv.due_date), new Date()) && !['paid', 'cancelled', 'written_off', 'draft'].includes(inv.status);
                  const isDueSoon = inv.due_date && !isOverdue && isBefore(new Date(inv.due_date), addDays(new Date(), 7));
                  return (
                    <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <button onClick={() => navigate(`/billing/${inv.id}`)} className="text-body-md font-medium text-accent hover:underline font-mono">
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td className="p-3 text-body-md">{getClientName(inv)}</td>
                      <td className="p-3 text-body-sm text-muted-foreground">{inv.cases?.case_number || '—'}</td>
                      <td className="p-3 text-body-sm">{inv.issue_date ? format(new Date(inv.issue_date), 'MMM d, yyyy') : '—'}</td>
                      <td className={`p-3 text-body-sm ${isOverdue ? 'text-destructive font-medium' : isDueSoon ? 'text-warning font-medium' : ''}`}>
                        {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="p-3 text-body-md font-medium">{formatAmount(inv.total_amount)}</td>
                      <td className={`p-3 text-body-md ${Number(inv.amount_paid) > 0 ? (Number(inv.amount_paid) >= Number(inv.total_amount) ? 'text-success' : 'text-warning') : ''}`}>
                        {formatAmount(inv.amount_paid)}
                      </td>
                      <td className="p-3">
                        {Number(inv.balance_due) <= 0 ? (
                          <StatusBadge status="paid" type="invoice" size="sm" />
                        ) : (
                          <span className="text-body-md font-medium text-destructive">{formatAmount(inv.balance_due)}</span>
                        )}
                      </td>
                      <td className="p-3"><StatusBadge status={inv.status} type="invoice" /></td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/billing/${inv.id}`)}><Eye size={14} className="me-2" />{t('billing.view')}</DropdownMenuItem>
                            {inv.status === 'draft' && <DropdownMenuItem onClick={() => navigate(`/billing/${inv.id}/edit`)}><Pencil size={14} className="me-2" />{t('common.edit')}</DropdownMenuItem>}
                            {['sent', 'viewed', 'partially_paid'].includes(inv.status) && (
                              <DropdownMenuItem onClick={() => navigate(`/billing/${inv.id}?payment=true`)}><DollarSign size={14} className="me-2" />{t('billing.recordPayment')}</DropdownMenuItem>
                            )}
                            {inv.status === 'draft' && <DropdownMenuItem onClick={() => handleSend(inv.id)}><Send size={14} className="me-2" />{t('billing.send')}</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => handleDuplicate(inv)}><Copy size={14} className="me-2" />{t('billing.duplicateInvoice')}</DropdownMenuItem>
                            {!['paid', 'cancelled', 'written_off'].includes(inv.status) && (
                              <DropdownMenuItem className="text-destructive" onClick={() => setCancelId(inv.id)}><XCircle size={14} className="me-2" />{t('billing.cancelInvoice')}</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        title={t('billing.messages.cancelConfirmTitle')}
        titleAr="إلغاء الفاتورة"
        message={t('billing.messages.cancelConfirmMessage')}
        messageAr="إلغاء هذه الفاتورة؟ لا يمكن التراجع. سيتم إرجاع سجلات الوقت المرتبطة إلى حالة الموافقة."
        type="danger"
      />
    </div>
  );
}
