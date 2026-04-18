import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface LineItem {
  id: string;
  description: string;
  line_type: string;
  quantity: number;
  unit_price: number;
  time_entry_id?: string;
}

export default function InvoiceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t, language } = useLanguage();
  const { profile, organization } = useAuth();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [currency, setCurrency] = useState('IQD');
  const [taxRate, setTaxRate] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [footerText, setFooterText] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: crypto.randomUUID(), description: '', line_type: 'service', quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  const orgId = profile?.organization_id;

  useEffect(() => {
    if (!orgId) return;
    supabase.from('clients').select('id, first_name, last_name, company_name, client_type').eq('organization_id', orgId).eq('status', 'active').then(({ data }) => setClients(data || []));
    if (organization) {
      setTaxRate(Number(organization.subscription_tier === 'starter' ? 0 : 0)); // Use org default
      setTerms('');
      setFooterText('');
    }
  }, [orgId, organization]);

  useEffect(() => {
    if (!orgId || !clientId) { setCases([]); return; }
    supabase.from('cases').select('id, case_number, title').eq('organization_id', orgId).eq('client_id', clientId).not('status', 'in', '("closed","archived")').then(({ data }) => setCases(data || []));
  }, [orgId, clientId]);

  useEffect(() => {
    if (!isEdit || !orgId) return;
    const load = async () => {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single();
      if (!inv) return navigate('/billing');
      setClientId(inv.client_id);
      setCaseId(inv.case_id || '');
      setIssueDate(new Date(inv.issue_date));
      setDueDate(new Date(inv.due_date));
      setCurrency(inv.currency);
      setTaxRate(Number(inv.tax_rate || 0));
      setDiscountType(inv.discount_type || 'fixed');
      setDiscountAmount(Number(inv.discount_amount || 0));
      setDiscountPercentage(Number(inv.discount_percentage || 0));
      setNotes(inv.notes || '');
      setTerms(inv.terms || '');
      setFooterText(inv.footer_text || '');

      const { data: items } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order');
      if (items?.length) {
        setLineItems(items.map((i: any) => ({ id: i.id, description: i.description, line_type: i.line_type, quantity: Number(i.quantity), unit_price: Number(i.unit_price), time_entry_id: i.time_entry_id })));
      }
    };
    load();
  }, [isEdit, id, orgId, navigate]);

  const getClientName = (c: any) => c.client_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.last_name || ''}`.trim();

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
  const discountValue = discountType === 'percentage' ? Math.round(subtotal * discountPercentage / 100 * 100) / 100 : discountAmount;
  const total = subtotal + taxAmount - discountValue;

  const formatNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0 });

  const handleImportOpen = async () => {
    if (!orgId || !clientId) return;
    let query = supabase.from('time_entries').select('*').eq('organization_id', orgId).eq('status', 'approved').is('invoice_id', null).eq('is_billable', true);
    if (clientId) query = query.eq('client_id', clientId);
    if (caseId) query = query.eq('case_id', caseId);
    const { data } = await query.order('date', { ascending: false });
    setTimeEntries(data || []);
    setSelectedEntries(new Set());
    setShowImport(true);
  };

  const handleImportConfirm = () => {
    const newItems: LineItem[] = timeEntries.filter(e => selectedEntries.has(e.id)).map(e => ({
      id: crypto.randomUUID(),
      description: e.description,
      line_type: 'time_entry',
      quantity: Math.round(e.duration_minutes / 60 * 100) / 100,
      unit_price: Number(e.billing_rate || 0),
      time_entry_id: e.id,
    }));
    setLineItems(prev => [...prev.filter(li => li.description || li.unit_price > 0), ...newItems]);
    setShowImport(false);
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: crypto.randomUUID(), description: '', line_type: 'service', quantity: 1, unit_price: 0 }]);
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!clientId) { toast({ title: t('billing.messages.clientRequired'), variant: 'destructive' }); return; }
    if (!lineItems.some(li => li.description)) { toast({ title: t('billing.messages.atLeastOneItem'), variant: 'destructive' }); return; }
    if (!orgId || !profile) return;

    setSaving(true);
    const invoiceData: any = {
      organization_id: orgId,
      client_id: clientId,
      case_id: caseId || null,
      issue_date: format(issueDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      currency,
      subtotal,
      tax_rate: taxRate,
      discount_amount: discountValue,
      discount_type: discountType,
      discount_percentage: discountPercentage,
      notes: notes || null,
      terms: terms || null,
      footer_text: footerText || null,
      status,
      created_by: profile.id,
      ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    };

    let invoiceId = id;

    if (isEdit) {
      const { error: updErr } = await supabase.from('invoices').update(invoiceData).eq('id', id);
      if (updErr) { toast({ title: updErr.message || 'Failed to update invoice', variant: 'destructive' }); setSaving(false); return; }
      const { error: delErr } = await supabase.from('invoice_line_items').delete().eq('invoice_id', id!);
      if (delErr) { toast({ title: delErr.message || 'Failed to update line items', variant: 'destructive' }); setSaving(false); return; }
    } else {
      const { data: newInv, error: insErr } = await supabase.from('invoices').insert(invoiceData).select().single();
      if (insErr || !newInv) { toast({ title: insErr?.message || 'Failed to create invoice', variant: 'destructive' }); setSaving(false); return; }
      invoiceId = newInv.id;
    }

    // Insert line items
    const itemsToInsert = lineItems.filter(li => li.description).map((li, i) => ({
      invoice_id: invoiceId,
      organization_id: orgId,
      description: li.description,
      line_type: li.line_type,
      quantity: li.quantity,
      unit_price: li.unit_price,
      time_entry_id: li.time_entry_id || null,
      sort_order: i,
    }));
    if (itemsToInsert.length) {
      const { error: liErr } = await supabase.from('invoice_line_items').insert(itemsToInsert);
      if (liErr) { toast({ title: liErr.message || 'Failed to save line items', variant: 'destructive' }); setSaving(false); return; }
    }

    // Update time entries with invoice_id
    const teIds = lineItems.filter(li => li.time_entry_id).map(li => li.time_entry_id!);
    if (teIds.length && invoiceId) {
      await supabase.from('time_entries').update({ invoice_id: invoiceId, status: 'invoiced' } as any).in('id', teIds);
    }

    toast({ title: isEdit ? t('billing.messages.invoiceUpdated') : t('billing.messages.invoiceCreated') });
    setSaving(false);
    navigate(`/billing/${invoiceId}`);
  };

  const lineTypeOptions = [
    { value: 'time_entry', label: 'Time Entry', labelAr: 'سجل وقت' },
    { value: 'fixed_fee', label: 'Fixed Fee', labelAr: 'رسوم ثابتة' },
    { value: 'expense', label: 'Expense', labelAr: 'مصاريف' },
    { value: 'service', label: 'Service', labelAr: 'خدمة' },
    { value: 'other', label: 'Other', labelAr: 'أخرى' },
  ];

  return (
    <div>
      <PageHeader
        title={isEdit ? t('billing.editInvoice') : t('billing.newInvoice')}
        titleAr={isEdit ? 'تعديل الفاتورة' : 'فاتورة جديدة'}
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Billing', labelAr: 'الفواتير', href: '/billing' },
          { label: isEdit ? 'Edit' : 'New Invoice', labelAr: isEdit ? 'تعديل' : 'فاتورة جديدة' },
        ]}
      />

      <div className="max-w-[960px] mx-auto space-y-6">
        {/* Client & Meta */}
        <div className="bg-card rounded-card border border-border p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('billing.invoice.client')} *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select client'} /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{getClientName(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('billing.invoice.caseOptional')}</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'اختر القضية' : 'Select case'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>{t('billing.invoice.issueDate')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start">
                    <CalendarIcon size={16} className="me-2" />{format(issueDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={issueDate} onSelect={d => d && setIssueDate(d)} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t('billing.invoice.dueDate')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start">
                    <CalendarIcon size={16} className="me-2" />{format(dueDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={d => d && setDueDate(d)} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t('billing.invoice.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IQD">IQD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card rounded-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-heading-md text-foreground">{t('billing.invoice.lineItems')}</h3>
            <Button variant="outline" size="sm" onClick={handleImportOpen} disabled={!clientId}>
              <Clock size={14} className="me-1" />{t('billing.invoice.importTimeEntries')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start text-body-sm text-muted-foreground p-2 w-8">#</th>
                  <th className="text-start text-body-sm text-muted-foreground p-2">{t('billing.invoice.description')}</th>
                  <th className="text-start text-body-sm text-muted-foreground p-2 w-24">{t('billing.invoice.lineType')}</th>
                  <th className="text-start text-body-sm text-muted-foreground p-2 w-20">{t('billing.invoice.quantity')}</th>
                  <th className="text-start text-body-sm text-muted-foreground p-2 w-28">{t('billing.invoice.unitPrice')}</th>
                  <th className="text-start text-body-sm text-muted-foreground p-2 w-28">{t('billing.invoice.lineTotal')}</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => (
                  <tr key={li.id} className="border-b border-border">
                    <td className="p-2 text-body-sm text-muted-foreground">{idx + 1}</td>
                    <td className="p-2"><Input value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="h-9" placeholder={language === 'ar' ? 'وصف...' : 'Description...'} /></td>
                    <td className="p-2">
                      <Select value={li.line_type} onValueChange={v => updateLineItem(idx, 'line_type', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{lineTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{language === 'ar' ? o.labelAr : o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-2"><Input type="number" value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))} className="h-9" step="0.25" min="0" /></td>
                    <td className="p-2"><Input type="number" value={li.unit_price} onChange={e => updateLineItem(idx, 'unit_price', Number(e.target.value))} className="h-9" min="0" /></td>
                    <td className="p-2 text-body-md font-medium">{formatNum(li.quantity * li.unit_price)}</td>
                    <td className="p-2">
                      {lineItems.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeLineItem(idx)}><Trash2 size={14} /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="ghost" className="mt-2 text-accent" onClick={addLineItem}><Plus size={14} className="me-1" />{t('billing.invoice.addLineItem')}</Button>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="bg-card rounded-card border border-border p-6 w-full max-w-[340px] space-y-3">
            <div className="flex justify-between text-body-md"><span>{t('billing.invoice.subtotal')}</span><span className="font-medium">{formatNum(subtotal)} {currency}</span></div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-md">{t('billing.invoice.tax')}</span>
              <div className="flex items-center gap-1">
                <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="h-8 w-16 text-center" min="0" max="100" />
                <span className="text-body-sm">%</span>
                <span className="text-body-md font-medium ms-2">{formatNum(taxAmount)} {currency}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-md">{t('billing.invoice.discount')}</span>
              <div className="flex items-center gap-1">
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t('billing.invoice.discountFixed')}</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={discountType === 'percentage' ? discountPercentage : discountAmount} onChange={e => discountType === 'percentage' ? setDiscountPercentage(Number(e.target.value)) : setDiscountAmount(Number(e.target.value))} className="h-8 w-20" min="0" />
              </div>
            </div>
            {discountValue > 0 && <div className="text-end text-body-sm text-muted-foreground">-{formatNum(discountValue)} {currency}</div>}
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-heading-md text-foreground">{t('billing.invoice.total')}</span>
              <span className="text-display-sm text-primary font-bold">{formatNum(total)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="bg-card rounded-card border border-border p-6 space-y-4">
          <div>
            <Label>{t('billing.invoice.notes')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1" placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'} />
          </div>
          <div>
            <Label>{t('billing.invoice.terms')}</Label>
            <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className="mt-1" placeholder={language === 'ar' ? 'شروط وأحكام...' : 'Terms and conditions...'} />
          </div>
          <div>
            <Label>{t('billing.invoice.footerText')}</Label>
            <Input value={footerText} onChange={e => setFooterText(e.target.value)} className="mt-1" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate('/billing')}>{t('common.cancel')}</Button>
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin me-1" />}
            {t('billing.saveAsDraft')}
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleSave('sent')} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin me-1" />}
            {t('billing.createAndSend')}
          </Button>
        </div>
      </div>

      {/* Import Time Entries Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowImport(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-modal shadow-xl p-6 max-w-[640px] w-[90%] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading-lg mb-4">{t('billing.invoice.importTimeEntries')}</h3>
            {timeEntries.length === 0 ? (
              <p className="text-body-md text-muted-foreground py-8 text-center">{t('billing.invoice.noApprovedEntries')}</p>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-start">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2 w-8"><input type="checkbox" checked={selectedEntries.size === timeEntries.length} onChange={e => setSelectedEntries(e.target.checked ? new Set(timeEntries.map(t => t.id)) : new Set())} /></th>
                      <th className="text-start text-body-sm p-2">{t('common.date')}</th>
                      <th className="text-start text-body-sm p-2">{t('common.description')}</th>
                      <th className="text-start text-body-sm p-2">{t('timeTracking.fields.duration')}</th>
                      <th className="text-start text-body-sm p-2">{t('timeTracking.fields.rate')}</th>
                      <th className="text-start text-body-sm p-2">{t('timeTracking.fields.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.map(te => (
                      <tr key={te.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-2"><input type="checkbox" checked={selectedEntries.has(te.id)} onChange={() => setSelectedEntries(prev => { const n = new Set(prev); n.has(te.id) ? n.delete(te.id) : n.add(te.id); return n; })} /></td>
                        <td className="p-2 text-body-sm">{te.date}</td>
                        <td className="p-2 text-body-sm truncate max-w-[200px]">{te.description}</td>
                        <td className="p-2 text-body-sm">{Math.floor(te.duration_minutes / 60)}h {te.duration_minutes % 60}m</td>
                        <td className="p-2 text-body-sm">{Number(te.billing_rate || 0).toLocaleString()}</td>
                        <td className="p-2 text-body-sm font-medium">{Number(te.total_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowImport(false)}>{t('common.cancel')}</Button>
              <Button className="bg-accent text-accent-foreground" onClick={handleImportConfirm} disabled={selectedEntries.size === 0}>
                {language === 'ar'
                  ? `استيراد ${selectedEntries.size} سجلات`
                  : `Import ${selectedEntries.size} entries`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
