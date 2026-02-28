import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Send, Pencil, MoreHorizontal, Copy, XCircle, Printer, CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language, isRTL } = useLanguage();
  const { profile, organization } = useAuth();

  const [invoice, setInvoice] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPayment, setShowPayment] = useState(searchParams.get('payment') === 'true');
  const [showCancel, setShowCancel] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);

  const orgId = profile?.organization_id;

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (!inv) { navigate('/billing'); return; }
    setInvoice(inv);
    setPaymentAmount(Number(inv.balance_due || 0));

    const [clientRes, itemsRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', inv.client_id).single(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
      supabase.from('payments').select('*, profiles:created_by(first_name, last_name)').eq('invoice_id', id).order('payment_date', { ascending: false }),
    ]);

    setClient(clientRes.data);
    setLineItems(itemsRes.data || []);
    setPayments(paymentsRes.data || []);

    if (inv.case_id) {
      const { data: c } = await supabase.from('cases').select('case_number, title').eq('id', inv.case_id).single();
      setCaseData(c);
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const formatAmount = (amount: number | null | undefined) => Number(amount || 0).toLocaleString('en-US');
  const getClientName = () => {
    if (!client) return '';
    return client.client_type === 'company' ? client.company_name : `${client.first_name || ''} ${client.last_name || ''}`.trim();
  };

  const handleRecordPayment = async () => {
    if (!invoice || !orgId || !profile || paymentAmount <= 0) return;
    setPaymentSaving(true);
    await supabase.from('payments').insert({
      organization_id: orgId,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount: paymentAmount,
      currency: invoice.currency,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      payment_method: paymentMethod,
      reference_number: paymentRef || null,
      notes: paymentNotes || null,
      created_by: profile.id,
    });
    toast({ title: t('billing.messages.paymentRecorded') });
    setPaymentSaving(false);
    setShowPayment(false);
    fetchInvoice();
  };

  const handleCancel = async () => {
    if (!invoice || !orgId) return;
    await supabase.from('time_entries').update({ status: 'approved', invoice_id: null } as any).eq('invoice_id', invoice.id).eq('organization_id', orgId);
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', invoice.id);
    toast({ title: t('billing.messages.invoiceCancelled') });
    setShowCancel(false);
    fetchInvoice();
  };

  const handleSend = async () => {
    if (!invoice) return;
    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoice.id);
    toast({ title: t('billing.messages.invoiceSent') });
    fetchInvoice();
  };

  const handleDuplicate = async () => {
    if (!invoice || !orgId || !profile) return;
    const { data: newInv } = await supabase.from('invoices').insert({
      organization_id: orgId, client_id: invoice.client_id, case_id: invoice.case_id,
      currency: invoice.currency, subtotal: invoice.subtotal, tax_rate: invoice.tax_rate,
      discount_amount: invoice.discount_amount, discount_type: invoice.discount_type,
      discount_percentage: invoice.discount_percentage, notes: invoice.notes,
      terms: invoice.terms, footer_text: invoice.footer_text, created_by: profile.id, status: 'draft',
    } as any).select().single();
    if (newInv) {
      const items = lineItems.map((item: any) => ({
        invoice_id: newInv.id, organization_id: orgId, description: item.description,
        line_type: item.line_type, quantity: item.quantity, unit_price: item.unit_price, sort_order: item.sort_order,
      }));
      if (items.length) await supabase.from('invoice_line_items').insert(items);
      toast({ title: t('billing.messages.invoiceDuplicated') });
      navigate(`/billing/${newInv.id}`);
    }
  };

  const handlePrint = () => { window.print(); };

  if (loading || !invoice) return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">{t('common.loading')}</div>;

  const isPaid = Number(invoice.balance_due) <= 0 && invoice.status === 'paid';
  const canRecordPayment = ['sent', 'viewed', 'partially_paid'].includes(invoice.status);

  const paymentMethods = [
    { value: 'cash', label: t('billing.payment.cash'), labelAr: 'نقدي' },
    { value: 'bank_transfer', label: t('billing.payment.bank_transfer'), labelAr: 'تحويل بنكي' },
    { value: 'check', label: t('billing.payment.check'), labelAr: 'شيك' },
    { value: 'credit_card', label: t('billing.payment.credit_card'), labelAr: 'بطاقة ائتمان' },
    { value: 'mobile_payment', label: t('billing.payment.mobile_payment'), labelAr: 'دفع إلكتروني' },
    { value: 'other', label: t('billing.payment.other'), labelAr: 'أخرى' },
  ];

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        titleAr={invoice.invoice_number}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Billing', labelAr: 'الفواتير', href: '/billing' },
          { label: invoice.invoice_number, labelAr: invoice.invoice_number },
        ]}
        secondaryActions={[
          ...(canRecordPayment ? [{ label: t('billing.recordPayment'), labelAr: 'تسجيل دفعة', icon: DollarSign, onClick: () => { setPaymentAmount(Number(invoice.balance_due || 0)); setShowPayment(true); } }] : []),
          ...(invoice.status === 'draft' ? [{ label: t('billing.send'), labelAr: 'إرسال', icon: Send, onClick: handleSend }] : []),
          ...(invoice.status === 'draft' ? [{ label: t('common.edit'), labelAr: 'تعديل', icon: Pencil, onClick: () => navigate(`/billing/${id}/edit`) }] : []),
        ]}
      />

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={invoice.status} type="invoice" size="md" />
        <span className="text-body-md text-muted-foreground">{getClientName()}</span>
        <div className="ms-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}><Copy size={14} className="me-2" />{t('billing.duplicateInvoice')}</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}><Printer size={14} className="me-2" />{t('billing.printInvoice')}</DropdownMenuItem>
              {!['paid', 'cancelled', 'written_off'].includes(invoice.status) && (
                <DropdownMenuItem className="text-destructive" onClick={() => setShowCancel(true)}><XCircle size={14} className="me-2" />{t('billing.cancelInvoice')}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="max-w-[800px] mx-auto print:max-w-full">
        <div className="bg-card rounded-card border border-border shadow-sm p-8 print:shadow-none print:border-none relative overflow-hidden">
          {isPaid && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[120px] font-bold text-success/10 rotate-[-30deg] select-none">{t('billing.paidWatermark')}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-display-sm text-foreground font-bold">{organization?.name || 'Law Firm'}</h2>
              {organization?.name_ar && <p className="text-body-md text-muted-foreground">{organization.name_ar}</p>}
            </div>
            <div className="text-end">
              <h1 className="text-display-sm text-foreground font-bold">{t('billing.invoice.title')} / فاتورة</h1>
              <p className="text-body-md mt-1"><span className="text-muted-foreground">#</span> <span className="font-mono font-medium">{invoice.invoice_number}</span></p>
              <p className="text-body-sm text-muted-foreground mt-1">{t('billing.invoice.issueDate')}: {format(new Date(invoice.issue_date), 'MMM d, yyyy')}</p>
              <p className="text-body-sm text-muted-foreground">{t('billing.invoice.dueDate')}: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
            </div>
          </div>

          {/* Bill To */}
          {client && (
            <div className="mb-6">
              <p className="text-body-sm text-muted-foreground font-medium uppercase mb-1">{t('billing.billTo')}</p>
              <p className="text-body-md font-medium">{getClientName()}</p>
              {client.address && <p className="text-body-sm text-muted-foreground">{client.address}</p>}
              {client.phone && <p className="text-body-sm text-muted-foreground">{client.phone}</p>}
              {client.email && <p className="text-body-sm text-muted-foreground">{client.email}</p>}
            </div>
          )}

          {caseData && (
            <p className="text-body-sm text-muted-foreground mb-6">{t('billing.regarding')}: {caseData.title} ({caseData.case_number})</p>
          )}

          {/* Line Items Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-start text-body-sm font-medium p-3">{t('billing.invoice.description')}</th>
                <th className="text-end text-body-sm font-medium p-3 w-20">{t('billing.invoice.quantity')}</th>
                <th className="text-end text-body-sm font-medium p-3 w-28">{t('billing.invoice.unitPrice')}</th>
                <th className="text-end text-body-sm font-medium p-3 w-28">{t('billing.invoice.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="p-3 text-body-md">{item.description}</td>
                  <td className="p-3 text-body-md text-end">{Number(item.quantity)}</td>
                  <td className="p-3 text-body-md text-end">{formatAmount(item.unit_price)}</td>
                  <td className="p-3 text-body-md text-end font-medium">{formatAmount(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-[280px] space-y-2">
              <div className="flex justify-between text-body-md"><span>{t('billing.invoice.subtotal')}</span><span>{formatAmount(invoice.subtotal)} {invoice.currency}</span></div>
              {Number(invoice.tax_rate) > 0 && (
                <div className="flex justify-between text-body-md"><span>{t('billing.invoice.tax')} ({invoice.tax_rate}%)</span><span>{formatAmount(invoice.tax_amount)} {invoice.currency}</span></div>
              )}
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-body-md"><span>{t('billing.invoice.discount')}</span><span>-{formatAmount(invoice.discount_amount)} {invoice.currency}</span></div>
              )}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-heading-md font-bold">{t('billing.invoice.total')}</span>
                <span className="text-heading-md font-bold">{formatAmount(invoice.total_amount)} {invoice.currency}</span>
              </div>
              {Number(invoice.amount_paid) > 0 && (
                <div className="flex justify-between text-body-md text-success"><span>{t('billing.invoice.amountPaid')}</span><span>{formatAmount(invoice.amount_paid)} {invoice.currency}</span></div>
              )}
              <div className="flex justify-between text-heading-sm font-bold text-primary">
                <span>{t('billing.invoice.balanceDue')}</span>
                <span>{formatAmount(invoice.balance_due)} {invoice.currency}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && <div className="mt-6 pt-4 border-t border-border"><p className="text-body-sm text-muted-foreground">{invoice.notes}</p></div>}
          {invoice.terms && <div className="mt-4"><p className="text-body-sm text-muted-foreground">{invoice.terms}</p></div>}
          {invoice.footer_text && <div className="mt-4"><p className="text-body-sm text-muted-foreground text-center">{invoice.footer_text}</p></div>}
        </div>

        {/* Payment History */}
        <div className="mt-8 bg-card rounded-card border border-border p-6 print:hidden">
          <h3 className="text-heading-md text-foreground mb-4">{t('billing.paymentHistory')}</h3>
          {payments.length === 0 ? (
            <p className="text-body-md text-muted-foreground py-4 text-center">{t('billing.noPayments')}</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start text-body-sm font-medium p-3">{t('billing.payment.date')}</th>
                  <th className="text-start text-body-sm font-medium p-3">{t('billing.payment.amount')}</th>
                  <th className="text-start text-body-sm font-medium p-3">{t('billing.payment.method')}</th>
                  <th className="text-start text-body-sm font-medium p-3">{t('billing.payment.reference')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="p-3 text-body-md">{format(new Date(p.payment_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-body-md font-medium text-success">{formatAmount(p.amount)} {p.currency}</td>
                    <td className="p-3 text-body-md capitalize">{p.payment_method?.replace('_', ' ')}</td>
                    <td className="p-3 text-body-sm text-muted-foreground">{p.reference_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden" onClick={() => setShowPayment(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[480px] w-[90%]" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading-lg mb-1">{t('billing.payment.title')}</h3>
            <p className="text-body-sm text-muted-foreground mb-4">
              {invoice.invoice_number} — {t('billing.invoice.balanceDue')}: {formatAmount(invoice.balance_due)} {invoice.currency}
            </p>

            <div className="space-y-4">
              <div>
                <Label>{t('billing.payment.amount')} *</Label>
                <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} min={0} max={Number(invoice.balance_due)} className="mt-1" />
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setPaymentAmount(Number(invoice.balance_due))}>{t('billing.fullBalance')}</Button>
                  <Button variant="outline" size="sm" onClick={() => setPaymentAmount(Math.round(Number(invoice.balance_due) / 2))}>{t('billing.half')}</Button>
                </div>
              </div>
              <div>
                <Label>{t('billing.payment.date')} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start"><CalendarIcon size={16} className="me-2" />{format(paymentDate, 'MMM d, yyyy')}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDate} onSelect={d => d && setPaymentDate(d)} className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>{t('billing.payment.method')} *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => <SelectItem key={m.value} value={m.value}>{language === 'ar' ? m.labelAr : m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('billing.payment.reference')}</Label>
                <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} className="mt-1" placeholder={language === 'ar' ? 'رقم الشيك، رقم التحويل...' : 'Check number, transfer ID...'} />
              </div>
              <div>
                <Label>{t('billing.payment.notes')}</Label>
                <Textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} className="mt-1" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayment(false)}>{t('common.cancel')}</Button>
              <Button className="flex-1 bg-success text-white hover:bg-success/90" onClick={handleRecordPayment} disabled={paymentSaving || paymentAmount <= 0}>
                {paymentSaving && <Loader2 size={16} className="animate-spin me-1" />}
                {t('billing.recordPayment')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title={t('billing.messages.cancelConfirmTitle')}
        titleAr="إلغاء الفاتورة"
        message={t('billing.messages.cancelConfirmMessage')}
        messageAr="إلغاء هذه الفاتورة؟ لا يمكن التراجع."
        type="danger"
      />
    </div>
  );
}
