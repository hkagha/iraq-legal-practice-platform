import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Send, Printer, Trash2, Plus, Receipt, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { resolveEntityName, resolvePersonName } from '@/lib/parties';

function fmt(amount: number, currency: string, lang: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-IQ', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';
  const lang = isEN ? 'en' : 'ar';

  const [payOpen, setPayOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: invoice, isLoading, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data: inv, error } = await supabase
        .from('invoices')
        .select(`
          *,
          person:persons(id, first_name, last_name, first_name_ar, last_name_ar, email, phone),
          entity:entities(id, company_name, company_name_ar, email, phone),
          case:cases(id, case_number, title, title_ar)
        `)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!inv) return null;
      const [{ data: lis }, { data: pays }] = await Promise.all([
        supabase.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('sort_order'),
        supabase.from('payments').select('*').eq('invoice_id', inv.id).order('payment_date', { ascending: false }),
      ]);
      return { ...inv, line_items: lis ?? [], payments: pays ?? [] };
    },
    enabled: !!id,
  });

  const { data: org } = useQuery({
    queryKey: ['invoice-org', invoice?.organization_id],
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

  if (isLoading) return <PageLoader />;
  if (!invoice) {
    return (
      <div className="container mx-auto p-6 max-w-[1100px]">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> {isEN ? 'Back to invoices' : 'العودة إلى الفواتير'}
        </Button>
        <EmptyState icon={Receipt} title="Invoice not found" titleAr="الفاتورة غير موجودة" />
      </div>
    );
  }

  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
  const isPaid = balance <= 0;
  const isCancelled = invoice.status === 'cancelled';
  const partyName = invoice.party_type === 'person'
    ? resolvePersonName(invoice.person as any, lang)
    : resolveEntityName(invoice.entity as any, lang);
  const partyContact = invoice.party_type === 'person' ? invoice.person : invoice.entity;

  const setStatus = async (newStatus: string) => {
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('billing.messages.invoiceSent'));
    refetch();
  };

  const cancelInvoice = async () => {
    const { error } = await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('billing.messages.invoiceCancelled'));
    setConfirmCancel(false);
    refetch();
  };

  const duplicateInvoice = async () => {
    const { line_items, payments, id: _i, invoice_number, status, amount_paid, viewed_at, paid_at, created_at, updated_at, person, entity, case: _c, ...rest } = invoice as any;
    const { data: newInv, error } = await supabase
      .from('invoices').insert({ ...rest, status: 'draft', amount_paid: 0, viewed_at: null, paid_at: null, created_by: user!.id })
      .select('id').single();
    if (error) { toast.error(error.message); return; }
    if (line_items?.length) {
      await supabase.from('invoice_line_items').insert(
        line_items.map((li: any, i: number) => ({
          invoice_id: newInv.id, organization_id: invoice.organization_id,
          description: li.description, description_ar: li.description_ar,
          line_type: li.line_type, quantity: li.quantity, unit_price: li.unit_price, sort_order: i,
        })),
      );
    }
    toast.success(t('billing.messages.invoiceDuplicated'));
    navigate(`/billing/${newInv.id}`);
  };

  const openPay = () => {
    setPayAmount(balance);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod('bank_transfer');
    setPayRef('');
    setPayNotes('');
    setPayOpen(true);
  };

  const recordPayment = async () => {
    if (payAmount <= 0) { toast.error(isEN ? 'Amount must be > 0' : 'يجب أن يكون المبلغ أكبر من صفر'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('payments').insert({
        organization_id: invoice.organization_id,
        invoice_id: invoice.id,
        amount: payAmount,
        currency: invoice.currency,
        payment_date: payDate,
        payment_method: payMethod,
        reference: payRef || null,
        notes: payNotes || null,
        created_by: user!.id,
      });
      if (error) throw error;
      toast.success(t('billing.messages.paymentRecorded'));
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-[1100px] print:p-0 print:max-w-none">
      {/* Toolbar (hidden in print) */}
      <div className="flex items-center justify-between mb-4 print:hidden gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {isEN ? 'Back' : 'رجوع'}
        </Button>
        <div className="flex gap-2 flex-wrap">
          {invoice.status === 'draft' && !isCancelled && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/billing/${invoice.id}/edit`)}>
              <Edit2 className="h-4 w-4 mr-1" /> {isEN ? 'Edit' : 'تعديل'}
            </Button>
          )}
          {invoice.status === 'draft' && (
            <Button size="sm" onClick={() => setStatus('sent')}>
              <Send className="h-4 w-4 mr-1" /> {t('billing.markAsSent')}
            </Button>
          )}
          {!isPaid && !isCancelled && invoice.status !== 'draft' && (
            <Button size="sm" onClick={openPay}>
              <Plus className="h-4 w-4 mr-1" /> {t('billing.recordPayment')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> {t('billing.printInvoice')}
          </Button>
          <Button variant="outline" size="sm" onClick={duplicateInvoice}>
            <Copy className="h-4 w-4 mr-1" /> {t('billing.duplicateInvoice')}
          </Button>
          {!isCancelled && invoice.status !== 'paid' && (
            <Button variant="outline" size="sm" onClick={() => setConfirmCancel(true)}>
              <Trash2 className="h-4 w-4 mr-1 text-destructive" /> {t('billing.cancelInvoice')}
            </Button>
          )}
        </div>
      </div>

      <Card className="relative overflow-hidden p-6 md:p-8 print:shadow-none print:border-0">
        {isPaid && !isCancelled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rotate-[-20deg] border-4 border-green-600/30 text-green-600/30 text-7xl font-bold px-10 py-4 rounded">
              {isEN ? 'PAID' : 'مدفوعة'}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-6 pb-6 border-b">
          <div>
            {org?.logo_url && <img src={org.logo_url} alt="" className="h-12 mb-3 object-contain" />}
            <h2 className="text-xl font-bold text-primary">{isEN ? org?.name : (org?.name_ar || org?.name)}</h2>
            {org?.address && <p className="text-sm text-muted-foreground mt-1">{isEN ? org.address : (org.address_ar || org.address)}</p>}
            {org?.phone && <p className="text-sm text-muted-foreground">{org.phone}</p>}
            {org?.email && <p className="text-sm text-muted-foreground">{org.email}</p>}
          </div>
          <div className={isEN ? 'text-right' : 'text-left'}>
            <h1 className="text-3xl font-bold text-primary">{isEN ? 'INVOICE' : 'فاتورة'}</h1>
            <p className="font-mono text-sm mt-1">{invoice.invoice_number}</p>
            <div className="mt-2"><StatusBadge status={invoice.status} type="invoice" /></div>
          </div>
        </div>

        {/* Bill To + Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('billing.billTo')}</p>
            <p className="font-semibold">{partyName || '—'}</p>
            {partyContact?.email && <p className="text-sm text-muted-foreground">{partyContact.email}</p>}
            {partyContact?.phone && <p className="text-sm text-muted-foreground">{partyContact.phone}</p>}
            {invoice.case && (
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">{t('billing.regarding')}: </span>
                <Link to={`/cases/${invoice.case.id}`} className="text-primary hover:underline">
                  {invoice.case.case_number} — {isEN ? invoice.case.title : (invoice.case.title_ar || invoice.case.title)}
                </Link>
              </p>
            )}
          </div>
          <div className={`grid grid-cols-2 gap-3 ${isEN ? 'md:text-right' : 'md:text-left'}`}>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('billing.invoice.issueDate')}</p>
              <p className="font-medium">{invoice.issue_date}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('billing.invoice.dueDate')}</p>
                <p className="font-medium">{invoice.due_date}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className={`py-2 ${isEN ? 'text-left' : 'text-right'} font-semibold`}>{t('billing.invoice.description')}</th>
              <th className="py-2 text-center font-semibold w-20">{t('billing.invoice.quantity')}</th>
              <th className={`py-2 ${isEN ? 'text-right' : 'text-left'} font-semibold w-32`}>{t('billing.invoice.unitPrice')}</th>
              <th className={`py-2 ${isEN ? 'text-right' : 'text-left'} font-semibold w-32`}>{t('billing.invoice.lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items as any[]).map((li: any) => (
              <tr key={li.id} className="border-b">
                <td className="py-3">{isEN ? li.description : (li.description_ar || li.description)}</td>
                <td className="py-3 text-center">{Number(li.quantity)}</td>
                <td className={`py-3 ${isEN ? 'text-right' : 'text-left'}`}>{fmt(Number(li.unit_price), invoice.currency, lang)}</td>
                <td className={`py-3 ${isEN ? 'text-right' : 'text-left'} font-medium`}>{fmt(Number(li.total ?? li.quantity * li.unit_price), invoice.currency, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className={`flex ${isEN ? 'justify-end' : 'justify-start'} mb-6`}>
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('billing.invoice.subtotal')}</span>
              <span>{fmt(Number(invoice.subtotal), invoice.currency, lang)}</span>
            </div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('billing.invoice.discount')}</span>
                <span>-{fmt(Number(invoice.discount_amount), invoice.currency, lang)}</span>
              </div>
            )}
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('billing.invoice.tax')}</span>
                <span>{fmt(Number(invoice.tax_amount), invoice.currency, lang)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{t('billing.invoice.total')}</span>
              <span>{fmt(Number(invoice.total_amount), invoice.currency, lang)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>{t('billing.invoice.amountPaid')}</span>
              <span>{fmt(Number(invoice.amount_paid), invoice.currency, lang)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{t('billing.invoice.balanceDue')}</span>
              <span className={balance > 0 ? 'text-destructive' : 'text-green-700'}>{fmt(balance, invoice.currency, lang)}</span>
            </div>
          </div>
        </div>

        {/* Payment history */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">{t('billing.paymentHistory')}</h3>
          {(invoice.payments as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('billing.noPayments')}</p>
          ) : (
            <div className="space-y-1 text-sm">
              {(invoice.payments as any[]).map((p: any) => (
                <div key={p.id} className="flex justify-between border-b py-2">
                  <span>{p.payment_date} · {t(`billing.payment.${p.payment_method}`)}{p.reference ? ` · ${p.reference}` : ''}</span>
                  <span className="font-medium">{fmt(Number(p.amount), invoice.currency, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bank details */}
        {!isPaid && !isCancelled && org?.bank_name && (
          <div className="bg-muted/30 rounded p-4 text-sm">
            <h3 className="font-semibold mb-2">{t('billing.bankDetails')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">{t('billing.bankName')}: </span>{org.bank_name}</div>
              {org.bank_account_number && <div><span className="text-muted-foreground">{t('billing.accountNumber')}: </span>{org.bank_account_number}</div>}
              {org.bank_iban && <div><span className="text-muted-foreground">{t('billing.iban')}: </span>{org.bank_iban}</div>}
              {org.bank_swift_code && <div><span className="text-muted-foreground">SWIFT: </span>{org.bank_swift_code}</div>}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 text-sm">
            <p className="font-semibold">{t('billing.invoice.notes')}</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{isEN ? invoice.notes : (invoice.notes_ar || invoice.notes)}</p>
          </div>
        )}
      </Card>

      {/* Record payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('billing.payment.title')}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPayAmount(balance)}>{t('billing.fullBalance')}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPayAmount(Math.round(balance / 2))}>{t('billing.half')}</Button>
            </div>
            <div>
              <Label>{t('billing.payment.amount')} *</Label>
              <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>{t('billing.payment.date')} *</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('billing.payment.method')}</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cash', 'bank_transfer', 'check', 'credit_card', 'mobile_payment', 'other'].map(m => (
                    <SelectItem key={m} value={m}>{t(`billing.payment.${m}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('billing.payment.reference')}</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder={t('billing.payment.referencePlaceholder')} />
            </div>
            <div>
              <Label>{t('billing.payment.notes')}</Label>
              <Textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>{isEN ? 'Cancel' : 'إلغاء'}</Button>
            <Button onClick={recordPayment} disabled={submitting}>{submitting ? t('billing.saving') : t('billing.recordPayment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={t('billing.messages.cancelConfirmTitle')}
        description={t('billing.messages.cancelConfirmMessage')}
        confirmLabel={t('billing.cancelInvoice')}
        variant="destructive"
        onConfirm={cancelInvoice}
      />
    </div>
  );
}
