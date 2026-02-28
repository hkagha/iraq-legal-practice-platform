import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Receipt, Plus, Scale, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

interface ClientBillingTabProps {
  clientId: string;
  clientName: string;
}

export default function ClientBillingTab({ clientId, clientName }: ClientBillingTabProps) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBilled: 0, totalPaid: 0, outstanding: 0, overdue: 0 });

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [invRes, payRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('payments').select('*, invoices(invoice_number)').eq('client_id', clientId).order('payment_date', { ascending: false }),
    ]);
    const invs = invRes.data || [];
    setInvoices(invs);
    setPayments(payRes.data || []);

    const totalBilled = invs.reduce((s: number, i: any) => s + (parseFloat(String(i.total_amount)) || 0), 0);
    const totalPaid = invs.reduce((s: number, i: any) => s + (parseFloat(String(i.amount_paid)) || 0), 0);
    const outstanding = invs.filter((i: any) => ['sent', 'viewed', 'partially_paid'].includes(i.status)).reduce((s: number, i: any) => s + (parseFloat(String(i.balance_due)) || 0), 0);
    const overdue = invs.filter((i: any) => !['paid', 'cancelled', 'written_off', 'draft'].includes(i.status) && i.due_date < today).reduce((s: number, i: any) => s + (parseFloat(String(i.balance_due)) || 0), 0);
    setStats({ totalBilled, totalPaid, outstanding, overdue });
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (d: string) => language === 'ar' ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale }) : format(new Date(d), 'MMM dd, yyyy');
  const fmtAmount = (a: number) => a ? `${a.toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-IQ')} IQD` : '—';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, color: '#3B82F6', bg: '#EFF6FF', label: language === 'ar' ? 'إجمالي الفوترة' : 'Total Billed', value: fmtAmount(stats.totalBilled) },
          { icon: CheckCircle, color: '#22C55E', bg: '#F0FDF4', label: language === 'ar' ? 'المدفوع' : 'Total Paid', value: fmtAmount(stats.totalPaid) },
          { icon: Receipt, color: '#F59E0B', bg: '#FFFBEB', label: language === 'ar' ? 'مستحق' : 'Outstanding', value: fmtAmount(stats.outstanding) },
          { icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', label: language === 'ar' ? 'متأخر' : 'Overdue', value: fmtAmount(stats.overdue) },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-body-sm text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-heading-sm font-semibold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-lg font-semibold text-foreground">{language === 'ar' ? 'الفواتير' : 'Invoices'}</h3>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm" onClick={() => navigate(`/billing/new?clientId=${clientId}`)}>
            <Plus size={14} className="me-1" /> {language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}
          </Button>
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title={t('clients.detail.noInvoicesYet')} titleAr={t('clients.detail.noInvoicesYet')} actionLabel={t('clients.detail.createInvoice')} actionLabelAr={t('clients.detail.createInvoice')} onAction={() => navigate(`/billing/new?clientId=${clientId}`)} size="sm" />
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">#</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.date')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المدفوع' : 'Paid'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المتبقي' : 'Balance'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/billing/${inv.id}`)}>
                    <td className="px-4 py-2.5 text-body-sm font-mono text-accent">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground">{fmtDate(inv.issue_date)}</td>
                    <td className="px-4 py-2.5 text-body-sm font-medium">{fmtAmount(parseFloat(inv.total_amount) || 0)}</td>
                    <td className="px-4 py-2.5 text-body-sm text-[#22C55E]">{fmtAmount(parseFloat(inv.amount_paid) || 0)}</td>
                    <td className={`px-4 py-2.5 text-body-sm font-medium ${parseFloat(inv.balance_due) > 0 ? 'text-destructive' : 'text-[#22C55E]'}`}>{parseFloat(inv.balance_due) > 0 ? fmtAmount(parseFloat(inv.balance_due)) : (language === 'ar' ? 'مدفوعة' : 'Paid')}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={inv.status} type="invoice" size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h3 className="text-heading-lg font-semibold text-foreground mb-3">{language === 'ar' ? 'سجل الدفعات' : 'Payment History'}</h3>
        {payments.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-body-md text-muted-foreground">{language === 'ar' ? 'لم يتم تسجيل دفعات بعد' : 'No payments recorded yet'}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{t('common.date')}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'الفاتورة' : 'Invoice'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'الطريقة' : 'Method'}</th>
                  <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-2.5">{language === 'ar' ? 'المرجع' : 'Reference'}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground">{fmtDate(p.payment_date)}</td>
                    <td className="px-4 py-2.5 text-body-sm font-mono text-accent">{p.invoices?.invoice_number || '—'}</td>
                    <td className="px-4 py-2.5 text-body-sm font-medium text-[#22C55E]">{fmtAmount(parseFloat(p.amount) || 0)}</td>
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground capitalize">{p.payment_method?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-2.5 text-body-sm text-muted-foreground">{p.reference_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
