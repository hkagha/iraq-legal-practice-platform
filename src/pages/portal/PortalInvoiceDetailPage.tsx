import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalOrg } from '@/contexts/PortalOrgContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Download, Copy, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

export default function PortalInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isPrint = searchParams.get('print') === '1';

  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();
  const { activeClientId } = usePortalOrg();

  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !profile?.id) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile?.id]);

  useEffect(() => {
    if (!isPrint) return;
    const tm = setTimeout(() => window.print(), 400);
    return () => clearTimeout(tm);
  }, [isPrint]);

  const loadData = async () => {
    setLoading(true);

    const invQuery = supabase.from('invoices').select('*').eq('id', id!);
    if (activeClientId) invQuery.eq('client_id', activeClientId);
    const [invRes, itemsRes, payRes] = await Promise.all([
      invQuery.maybeSingle(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id!).order('sort_order'),
      supabase.from('payments').select('*').eq('invoice_id', id!).order('payment_date', { ascending: false }),
    ]);

    const inv = invRes.data;
    if (inv) {
      setInvoice(inv);
      setLineItems(itemsRes.data || []);
      setPayments(payRes.data || []);

      // Mark as viewed via secure RPC
      if (!inv.viewed_at) {
        await supabase.rpc('client_mark_invoice_viewed', { p_invoice_id: inv.id });
      }

      // Org info
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, name_ar, phone, email, address, address_ar, bank_name, bank_account_number, bank_iban, logo_url')
        .eq('id', inv.organization_id)
        .maybeSingle();
      setOrg(orgData);
    }

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

  const currency = invoice?.currency || 'IQD';
  const formatAmount = (amount: number) => `${(amount || 0).toLocaleString()} ${currency}`;

  const copyBankDetails = () => {
    if (!org) return;
    const text = `${org.bank_name || ''}\n${org.bank_account_number || ''}\n${org.bank_iban ? 'IBAN: ' + org.bank_iban : ''}\n${language === 'en' ? 'Reference:' : 'المرجع:'} ${invoice?.invoice_number}`;
    navigator.clipboard.writeText(text);
    toast({ title: language === 'en' ? 'Bank details copied' : 'تم نسخ تفاصيل البنك' });
  };

  const paid = useMemo(() => (invoice ? Number(invoice.balance_due || 0) <= 0 : false), [invoice]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-lg" /></div>;
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('portal.noAccess')}</p>
        <Link to="/portal/invoices" className="text-accent hover:underline mt-2 inline-block">{t('common.back')}</Link>
      </div>
    );
  }

  return (
    <div className={isPrint ? 'print:p-0' : 'space-y-6'}>
      {!isPrint && (
        <>
          <nav className="flex items-center gap-1 text-body-sm text-muted-foreground">
            <Link to="/portal/invoices" className="text-accent hover:underline">{t('portal.invoices.title')}</Link>
            <span>{isRTL ? ' \\ ' : ' / '}</span>
            <span className="text-foreground">{invoice.invoice_number}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-display-lg font-bold font-mono text-foreground">{invoice.invoice_number}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={invoice.status} type="invoice" />
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={`/portal/invoices/${invoice.id}?print=1`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4 me-2" /> {t('portal.invoices.downloadPdf')}
              </a>
            </Button>
          </div>
        </>
      )}

      {/* Invoice preview */}
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 relative print:border-none print:shadow-none">
        {paid && (
          <div className="absolute top-6 end-6 rotate-[-15deg] border-4 border-success text-success font-bold text-2xl px-4 py-1 rounded opacity-30 print:hidden">
            PAID
          </div>
        )}

        <div className="flex justify-between items-start mb-8">
          <div>
            {org?.logo_url && <img src={org.logo_url} alt="" className="h-12 w-12 rounded object-contain mb-2" />}
            <h2 className="text-lg font-bold text-foreground">{language === 'ar' && org?.name_ar ? org.name_ar : org?.name}</h2>
            {org?.phone && <p className="text-body-sm text-muted-foreground">{org.phone}</p>}
            {org?.email && <p className="text-body-sm text-muted-foreground">{org.email}</p>}
            {org?.address && <p className="text-body-sm text-muted-foreground">{language === 'ar' && org.address_ar ? org.address_ar : org.address}</p>}
          </div>
          <div className="text-end">
            <p className="text-body-sm text-muted-foreground">{language === 'en' ? 'Issue Date' : 'تاريخ الإصدار'}</p>
            <p className="text-body-md font-medium">{formatDate(invoice.issue_date)}</p>
            <p className="text-body-sm text-muted-foreground mt-2">{language === 'en' ? 'Due Date' : 'تاريخ الاستحقاق'}</p>
            <p className="text-body-md font-medium">{formatDate(invoice.due_date)}</p>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-border">
              <th className="text-start text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Description' : 'الوصف'}</th>
              <th className="text-end text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Qty' : 'الكمية'}</th>
              <th className="text-end text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Rate' : 'السعر'}</th>
              <th className="text-end text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Amount' : 'المبلغ'}</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item: any) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-3 text-body-md text-foreground">{language === 'ar' && item.description_ar ? item.description_ar : item.description}</td>
                <td className="py-3 text-body-md text-foreground text-end">{item.quantity}</td>
                <td className="py-3 text-body-md text-foreground text-end">{(item.unit_price || 0).toLocaleString()}</td>
                <td className="py-3 text-body-md text-foreground text-end font-medium">{((item.quantity || 1) * (item.unit_price || 0)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-body-md">
              <span className="text-muted-foreground">{language === 'en' ? 'Subtotal' : 'المجموع الفرعي'}</span>
              <span>{formatAmount(invoice.subtotal)}</span>
            </div>
            {(invoice.tax_amount || 0) > 0 && (
              <div className="flex justify-between text-body-md">
                <span className="text-muted-foreground">{language === 'en' ? 'Tax' : 'الضريبة'} ({invoice.tax_rate}%)</span>
                <span>{formatAmount(invoice.tax_amount)}</span>
              </div>
            )}
            {(invoice.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-body-md text-success">
                <span>{language === 'en' ? 'Discount' : 'الخصم'}</span>
                <span>-{formatAmount(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-heading-sm font-bold border-t border-border pt-2">
              <span>{language === 'en' ? 'Total' : 'الإجمالي'}</span>
              <span>{formatAmount(invoice.total_amount)}</span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <div className="flex justify-between text-body-md text-success">
                <span>{language === 'en' ? 'Paid' : 'المدفوع'}</span>
                <span>-{formatAmount(invoice.amount_paid)}</span>
              </div>
            )}
            {(invoice.balance_due || 0) > 0 && (
              <div className="flex justify-between text-heading-sm font-bold text-accent bg-accent/10 -mx-3 px-3 py-2 rounded">
                <span>{language === 'en' ? 'Amount Due' : 'المبلغ المستحق'}</span>
                <span>{formatAmount(invoice.balance_due)}</span>
              </div>
            )}
          </div>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="mt-6 pt-4 border-t border-border space-y-3">
            {invoice.notes && (
              <div>
                <p className="text-body-sm font-medium text-muted-foreground">{language === 'en' ? 'Notes' : 'ملاحظات'}</p>
                <p className="text-body-md text-foreground whitespace-pre-wrap">{language === 'ar' && invoice.notes_ar ? invoice.notes_ar : invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-body-sm font-medium text-muted-foreground">{language === 'en' ? 'Terms' : 'الشروط'}</p>
                <p className="text-body-md text-foreground whitespace-pre-wrap">{language === 'ar' && invoice.terms_ar ? invoice.terms_ar : invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      {!isPrint && payments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('portal.invoices.paymentHistory')}</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start text-body-sm font-medium text-muted-foreground py-2">{t('common.date')}</th>
                <th className="text-end text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Amount' : 'المبلغ'}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Method' : 'الطريقة'}</th>
                <th className="text-start text-body-sm font-medium text-muted-foreground py-2">{language === 'en' ? 'Reference' : 'المرجع'}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 text-body-md">{formatDate(p.payment_date)}</td>
                  <td className="py-2 text-body-md text-end font-medium text-success">{formatAmount(p.amount)}</td>
                  <td className="py-2 text-body-md text-muted-foreground">{p.payment_method || '—'}</td>
                  <td className="py-2 text-body-md text-muted-foreground">{p.reference_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bank transfer */}
      {!isPrint && (invoice.balance_due || 0) > 0 && org && (org.bank_name || org.bank_account_number) && (
        <div className="bg-card border border-accent/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">{language === 'en' ? 'Pay via Bank Transfer' : 'الدفع عبر التحويل البنكي'}</h2>
          </div>
          <div className="space-y-2 text-body-md">
            {org.bank_name && <p><span className="text-muted-foreground">{language === 'en' ? 'Bank: ' : 'البنك: '}</span>{org.bank_name}</p>}
            {org.bank_account_number && <p><span className="text-muted-foreground">{language === 'en' ? 'Account: ' : 'الحساب: '}</span>{org.bank_account_number}</p>}
            {org.bank_iban && <p><span className="text-muted-foreground">IBAN: </span>{org.bank_iban}</p>}
            <p><span className="text-muted-foreground">{language === 'en' ? 'Reference: ' : 'المرجع: '}</span>{invoice.invoice_number}</p>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={copyBankDetails}>
            <Copy className="h-4 w-4 me-2" /> {language === 'en' ? 'Copy Bank Details' : 'نسخ تفاصيل البنك'}
          </Button>
          <p className="text-body-sm text-muted-foreground mt-3">
            {language === 'en'
              ? 'After making the payment, please contact us with the payment confirmation.'
              : 'بعد إجراء الدفع، يرجى التواصل معنا مع تأكيد الدفع.'}
          </p>
        </div>
      )}
    </div>
  );
}
