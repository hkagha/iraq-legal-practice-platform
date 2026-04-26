import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Receipt, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';

function formatMoney(amount: number, currency: string, lang: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-IQ', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export default function PortalInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, isRTL } = useLanguage();
  const isEN = language === 'en';

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['portal-invoice', id],
    queryFn: async () => {
      const { data: inv, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id!)
        .neq('status', 'draft')
        .maybeSingle();
      if (error) throw error;
      if (!inv) return null;
      const [{ data: lineItems }, { data: payments }] = await Promise.all([
        supabase.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('sort_order'),
        supabase.from('payments').select('id, amount, payment_date, payment_method, reference_number').eq('invoice_id', inv.id).order('payment_date'),
      ]);
      return { ...inv, line_items: lineItems ?? [], payments: payments ?? [] };
    },
    enabled: !!id,
  });

  const { data: org } = useQuery({
    queryKey: ['portal-invoice-org', invoice?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('name, name_ar, logo_url, address, address_ar, phone, email, bank_name, bank_account_number, bank_iban, bank_swift_code')
        .eq('id', invoice!.organization_id)
        .maybeSingle();
      return data;
    },
    enabled: !!invoice?.organization_id,
  });

  // Mark as viewed
  useEffect(() => {
    if (invoice?.id && !invoice.viewed_at) {
      supabase.rpc('client_mark_invoice_viewed', { p_invoice_id: invoice.id });
    }
  }, [invoice?.id, invoice?.viewed_at]);

  if (isLoading) return <PageLoader />;
  if (!invoice) {
    return (
      <div className="max-w-[1100px] mx-auto p-6">
        <EmptyState
          icon={Receipt}
          title="Invoice not found"
          titleAr="لم يتم العثور على الفاتورة"
          subtitle="This invoice does not exist or is not available."
          subtitleAr="هذه الفاتورة غير موجودة أو غير متاحة."
        />
      </div>
    );
  }

  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
  const isPaid = balance <= 0;
  const lineItems = (invoice as any).line_items ?? [];
  const payments = (invoice as any).payments ?? [];

  return (
    <div className="max-w-[1000px] mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/portal/invoices"
          className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          {isEN ? 'Back to invoices' : 'العودة إلى الفواتير'}
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4 me-2" />
          {isEN ? 'Print / PDF' : 'طباعة / PDF'}
        </Button>
      </div>

      <Card className="relative overflow-hidden p-6 md:p-8">
        {isPaid && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rotate-[-20deg] border-4 border-success/30 text-success/30 text-6xl font-bold px-8 py-3 rounded">
              {isEN ? 'PAID' : 'مدفوعة'}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-6 pb-6 border-b">
          <div>
            {org?.logo_url && (
              <img src={org.logo_url} alt="" className="h-12 mb-3 object-contain" />
            )}
            <h2 className="text-heading-lg font-bold text-primary">
              {isEN ? org?.name : (org?.name_ar || org?.name)}
            </h2>
            {org?.address && (
              <p className="text-body-sm text-muted-foreground mt-1">
                {isEN ? org.address : (org.address_ar || org.address)}
              </p>
            )}
            {org?.phone && <p className="text-body-sm text-muted-foreground">{org.phone}</p>}
            {org?.email && <p className="text-body-sm text-muted-foreground">{org.email}</p>}
          </div>
          <div className={isRTL ? 'text-left' : 'text-right'}>
            <h1 className="text-display-sm font-bold text-primary">
              {isEN ? 'INVOICE' : 'فاتورة'}
            </h1>
            <p className="text-body-md font-mono mt-1">{invoice.invoice_number}</p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} type="invoice" />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-body-sm text-muted-foreground">{isEN ? 'Issue date' : 'تاريخ الإصدار'}</p>
            <p className="text-body-md font-medium">{invoice.issue_date}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-body-sm text-muted-foreground">{isEN ? 'Due date' : 'تاريخ الاستحقاق'}</p>
              <p className="text-body-md font-medium">{invoice.due_date}</p>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="mb-6">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b">
                <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'} font-semibold`}>
                  {isEN ? 'Description' : 'الوصف'}
                </th>
                <th className="py-2 text-center font-semibold w-20">{isEN ? 'Qty' : 'الكمية'}</th>
                <th className={`py-2 ${isRTL ? 'text-left' : 'text-right'} font-semibold w-32`}>
                  {isEN ? 'Unit price' : 'سعر الوحدة'}
                </th>
                <th className={`py-2 ${isRTL ? 'text-left' : 'text-right'} font-semibold w-32`}>
                  {isEN ? 'Total' : 'المجموع'}
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li: any) => (
                <tr key={li.id} className="border-b">
                  <td className="py-3">{isEN ? li.description : (li.description_ar || li.description)}</td>
                  <td className="py-3 text-center">{Number(li.quantity)}</td>
                  <td className={`py-3 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {formatMoney(Number(li.unit_price), invoice.currency, language)}
                  </td>
                  <td className={`py-3 ${isRTL ? 'text-left' : 'text-right'} font-medium`}>
                    {formatMoney(Number(li.total), invoice.currency, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-6`}>
          <div className="w-full max-w-xs space-y-2 text-body-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEN ? 'Subtotal' : 'المجموع الفرعي'}</span>
              <span>{formatMoney(Number(invoice.subtotal), invoice.currency, language)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isEN ? 'Discount' : 'الخصم'}</span>
                <span>-{formatMoney(Number(invoice.discount_amount), invoice.currency, language)}</span>
              </div>
            )}
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isEN ? 'Tax' : 'الضريبة'}</span>
                <span>{formatMoney(Number(invoice.tax_amount), invoice.currency, language)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-body-md">
              <span>{isEN ? 'Total' : 'الإجمالي'}</span>
              <span>{formatMoney(Number(invoice.total_amount), invoice.currency, language)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>{isEN ? 'Paid' : 'المدفوع'}</span>
              <span>{formatMoney(Number(invoice.amount_paid), invoice.currency, language)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{isEN ? 'Balance due' : 'الرصيد المستحق'}</span>
              <span className={balance > 0 ? 'text-error' : 'text-success'}>
                {formatMoney(balance, invoice.currency, language)}
              </span>
            </div>
          </div>
        </div>

        {/* Payments */}
        {payments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-body-md font-semibold mb-2">{isEN ? 'Payments received' : 'الدفعات المستلمة'}</h3>
            <div className="space-y-1 text-body-sm">
              {payments.map((p: any) => (
                <div key={p.id} className="flex justify-between border-b py-2">
                  <span>{p.payment_date} · {p.payment_method}{p.reference_number ? ` · ${p.reference_number}` : ''}</span>
                  <span className="font-medium">{formatMoney(Number(p.amount), invoice.currency, language)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank details */}
        {!isPaid && org?.bank_name && (
          <div className="bg-muted/30 rounded p-4 text-body-sm">
            <h3 className="font-semibold mb-2">{isEN ? 'Bank transfer details' : 'تفاصيل التحويل المصرفي'}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">{isEN ? 'Bank' : 'البنك'}: </span>{org.bank_name}</div>
              {org.bank_account_number && (
                <div><span className="text-muted-foreground">{isEN ? 'Account' : 'الحساب'}: </span>{org.bank_account_number}</div>
              )}
              {org.bank_iban && <div><span className="text-muted-foreground">IBAN: </span>{org.bank_iban}</div>}
              {org.bank_swift_code && <div><span className="text-muted-foreground">SWIFT: </span>{org.bank_swift_code}</div>}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 text-body-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{isEN ? 'Notes' : 'ملاحظات'}</p>
            <p>{isEN ? invoice.notes : (invoice.notes_ar || invoice.notes)}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
