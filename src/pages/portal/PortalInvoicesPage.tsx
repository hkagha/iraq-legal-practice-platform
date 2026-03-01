import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  currency: string;
}

export default function PortalInvoicesPage() {
  const { t, language } = useLanguage();
  const { activeClientId } = usePortalOrg();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;
    loadInvoices();
  }, [activeClientId]);

  const loadInvoices = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, total_amount, amount_paid, balance_due, status, currency')
      .eq('client_id', activeClientId!)
      .not('status', 'in', '("draft","cancelled","written_off")')
      .order('created_at', { ascending: false });

    setInvoices((data || []) as Invoice[]);
    setLoading(false);
  };

  const formatDate = (d: string) => {
    try {
      return language === 'ar'
        ? format(new Date(d), 'dd MMM yyyy', { locale: arLocale })
        : format(new Date(d), 'MMM dd, yyyy');
    } catch {
      return d;
    }
  };

  const formatAmount = (amount: number, currency: string) => `${(amount || 0).toLocaleString()} ${currency}`;

  const totalOutstanding = invoices
    .filter(i => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status))
    .reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const totalOverdue = invoices
    .filter(i => new Date(i.due_date) < new Date() && (i.balance_due || 0) > 0 && i.status !== 'paid')
    .reduce((s, i) => s + (i.balance_due || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-lg font-bold text-foreground">{t('portal.invoices.title')}</h1>
        <p className="text-body-md text-muted-foreground mt-1">{t('portal.invoices.subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-body-sm text-muted-foreground">{language === 'en' ? 'Total Outstanding' : 'إجمالي المستحق'}</p>
          <p className="text-display-sm font-bold text-warning">{formatAmount(totalOutstanding, 'IQD')}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-body-sm text-muted-foreground">{language === 'en' ? 'Total Paid' : 'إجمالي المدفوع'}</p>
          <p className="text-display-sm font-bold text-success">{formatAmount(totalPaid, 'IQD')}</p>
        </div>
        {totalOverdue > 0 && (
          <div className="bg-card rounded-xl border border-destructive/30 p-5">
            <p className="text-body-sm text-muted-foreground">{language === 'en' ? 'Overdue' : 'متأخر'}</p>
            <p className="text-display-sm font-bold text-destructive">{formatAmount(totalOverdue, 'IQD')}</p>
          </div>
        )}
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title={t('portal.invoices.noInvoices')} titleAr={t('portal.invoices.noInvoices')} />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3">{language === 'en' ? 'Invoice #' : 'رقم الفاتورة'}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3">{language === 'en' ? 'Date' : 'التاريخ'}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3">{language === 'en' ? 'Due Date' : 'تاريخ الاستحقاق'}</th>
                <th className="text-end text-body-sm font-medium text-muted-foreground px-4 py-3">{language === 'en' ? 'Total' : 'الإجمالي'}</th>
                <th className="text-end text-body-sm font-medium text-muted-foreground px-4 py-3">{language === 'en' ? 'Paid' : 'المدفوع'}</th>
                <th className="text-end text-body-sm font-medium text-muted-foreground px-4 py-3">{language === 'en' ? 'Balance' : 'المتبقي'}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground px-4 py-3">{t('common.status')}</th>
                <th className="text-end text-body-sm font-medium text-muted-foreground px-4 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const isOverdue = new Date(inv.due_date) < new Date() && (inv.balance_due || 0) > 0 && inv.status !== 'paid';
                return (
                  <tr key={inv.id} className={cn('border-b border-border/50 hover:bg-muted/30 transition-colors', isOverdue && 'bg-destructive/5')}>
                    <td className="px-4 py-3">
                      <Link to={`/portal/invoices/${inv.id}`} className="text-body-md font-mono text-accent hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-muted-foreground">{formatDate(inv.issue_date)}</td>
                    <td className={cn('px-4 py-3 text-body-sm', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-body-sm text-foreground text-end">{formatAmount(inv.total_amount, inv.currency)}</td>
                    <td className="px-4 py-3 text-body-sm text-foreground text-end">{formatAmount(inv.amount_paid, inv.currency)}</td>
                    <td className="px-4 py-3 text-body-sm text-foreground font-medium text-end">{formatAmount(inv.balance_due, inv.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={isOverdue ? 'overdue' : inv.status} type="invoice" size="sm" /></td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex items-center gap-3">
                        <Link to={`/portal/invoices/${inv.id}`} className="text-accent hover:underline text-body-sm">{language === 'en' ? 'View' : 'عرض'}</Link>
                        <a
                          href={`/portal/invoices/${inv.id}?print=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline text-body-sm inline-flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" /> {language === 'en' ? 'Download' : 'تحميل'}
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
