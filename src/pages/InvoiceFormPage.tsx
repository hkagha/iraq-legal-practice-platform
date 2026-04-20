import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PartySelector } from '@/components/parties/PartySelector';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import type { PartyRef } from '@/types/parties';

type LineItem = {
  id?: string;
  description: string;
  description_ar?: string | null;
  line_type: 'service' | 'time_entry' | 'fixed_fee' | 'expense' | 'discount' | 'other';
  quantity: number;
  unit_price: number;
  sort_order: number;
};

const blankItem = (sort = 0): LineItem => ({
  description: '',
  line_type: 'service',
  quantity: 1,
  unit_price: 0,
  sort_order: sort,
});

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const isEN = language === 'en';

  const [party, setParty] = useState<PartyRef | null>(null);
  const [caseId, setCaseId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('IQD');
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([blankItem(0)]);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Fetch user org
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('organization_id').eq('id', user.id).maybeSingle().then(({ data }) => {
      setOrgId(data?.organization_id ?? null);
    });
  }, [user]);

  // Load existing invoice
  const { data: existing, isLoading } = useQuery({
    queryKey: ['invoice-edit', id],
    queryFn: async () => {
      const { data: inv, error } = await supabase
        .from('invoices').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      if (!inv) return null;
      const { data: lis } = await supabase
        .from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('sort_order');
      return { ...inv, line_items: lis ?? [] };
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setParty({
      partyType: existing.party_type as 'person' | 'entity',
      personId: existing.person_id,
      entityId: existing.entity_id,
      displayName: '',
    });
    setCaseId(existing.case_id || '');
    setIssueDate(existing.issue_date);
    setDueDate(existing.due_date || '');
    setCurrency(existing.currency);
    const sub = Number(existing.subtotal) || 0;
    const taxAmt = Number(existing.tax_amount) || 0;
    setTaxRate(sub > 0 ? Math.round((taxAmt / sub) * 10000) / 100 : 0);
    setDiscountAmount(Number(existing.discount_amount) || 0);
    setNotes(existing.notes || '');
    setItems((existing.line_items || []).map((li: any, i: number) => ({
      id: li.id,
      description: li.description,
      description_ar: li.description_ar,
      line_type: li.line_type,
      quantity: Number(li.quantity),
      unit_price: Number(li.unit_price),
      sort_order: li.sort_order ?? i,
    })));
  }, [existing]);

  // Cases for the chosen party
  const { data: cases } = useQuery({
    queryKey: ['cases-for-party', party?.personId, party?.entityId],
    queryFn: async () => {
      if (!party) return [];
      const { data: ps } = await supabase
        .from('case_parties')
        .select('case_id, cases!inner(id, case_number, title, title_ar, status)')
        .eq(party.partyType === 'person' ? 'person_id' : 'entity_id', (party.partyType === 'person' ? party.personId : party.entityId)!);
      const seen = new Set<string>();
      return (ps ?? []).map((r: any) => r.cases).filter((c: any) => c && !seen.has(c.id) && seen.add(c.id));
    },
    enabled: !!party,
  });

  const subtotal = useMemo(
    () => items.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0),
    [items],
  );
  const taxAmount = useMemo(
    () => Math.max(0, (subtotal - discountAmount) * ((Number(taxRate) || 0) / 100)),
    [subtotal, discountAmount, taxRate],
  );
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(items.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  };

  const addItem = () => setItems([...items, blankItem(items.length)]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async (sendNow: boolean) => {
    if (!party) {
      toast.error(t('billing.messages.clientRequired'));
      return;
    }
    if (items.length === 0 || items.every(li => !li.description.trim())) {
      toast.error(t('billing.messages.atLeastOneItem'));
      return;
    }
    if (!orgId) {
      toast.error(isEN ? 'Organization missing' : 'المنظمة مفقودة');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        organization_id: orgId,
        party_type: party.partyType,
        person_id: party.partyType === 'person' ? party.personId : null,
        entity_id: party.partyType === 'entity' ? party.entityId : null,
        case_id: caseId || null,
        issue_date: issueDate,
        due_date: dueDate || null,
        currency,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: total,
        notes: notes || null,
        status: sendNow ? 'sent' : (existing?.status || 'draft'),
        created_by: user!.id,
      };

      let invoiceId = id;
      if (isEdit) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', id!);
        if (error) throw error;
        await supabase.from('invoice_line_items').delete().eq('invoice_id', id!);
      } else {
        const { data, error } = await supabase.from('invoices').insert(payload).select('id').single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const cleanItems = items.filter(li => li.description.trim());
      if (cleanItems.length > 0) {
        const { error: liErr } = await supabase.from('invoice_line_items').insert(
          cleanItems.map((li, i) => ({
            invoice_id: invoiceId!,
            organization_id: orgId,
            description: li.description,
            description_ar: li.description_ar || null,
            line_type: li.line_type,
            quantity: li.quantity,
            unit_price: li.unit_price,
            sort_order: i,
          })),
        );
        if (liErr) throw liErr;
      }

      toast.success(isEdit ? t('billing.messages.invoiceUpdated') : t('billing.messages.invoiceCreated'));
      navigate(`/billing/${invoiceId}`);
    } catch (e: any) {
      toast.error(e.message || (isEN ? 'Failed to save invoice' : 'فشل حفظ الفاتورة'));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) return <PageLoader />;

  return (
    <div className="container mx-auto p-6 max-w-[1100px]">
      <Button variant="ghost" size="sm" onClick={() => navigate('/billing')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> {isEN ? 'Back' : 'رجوع'}
      </Button>
      <PageHeader
        title={isEdit ? t('billing.editInvoice') : t('billing.newInvoice')}
        titleAr={isEdit ? t('billing.editInvoice') : t('billing.newInvoice')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: invoice details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <div>
              <Label>{t('billing.invoice.client')} *</Label>
              <PartySelector value={party} onChange={setParty} />
            </div>
            {(cases?.length ?? 0) > 0 && (
              <div>
                <Label>{t('billing.invoice.caseOptional')}</Label>
                <Select value={caseId || 'none'} onValueChange={(v) => setCaseId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={isEN ? 'Select case' : 'اختر القضية'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isEN ? 'No case' : 'بدون قضية'}</SelectItem>
                    {cases!.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.case_number} — {isEN ? c.title : (c.title_ar || c.title)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('billing.invoice.issueDate')} *</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>{t('billing.invoice.dueDate')}</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t('billing.invoice.currency')}</Label>
              <CurrencySelect value={currency} onChange={(v) => setCurrency(v || 'IQD')} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t('billing.invoice.lineItems')}</h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> {t('billing.invoice.addLineItem')}
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((li, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start border-b pb-3 last:border-0">
                  <div className="col-span-12 md:col-span-5">
                    <Input
                      value={li.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder={t('billing.invoice.description')}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Select value={li.line_type} onValueChange={(v) => updateItem(idx, { line_type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['service', 'time_entry', 'fixed_fee', 'expense', 'discount', 'other'].map(lt => (
                          <SelectItem key={lt} value={lt}>{t(`billing.invoice.lineTypes.${lt}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <Input type="number" min="0" step="0.01" value={li.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Input type="number" min="0" step="0.01" value={li.unit_price}
                      onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2 md:col-span-1 text-right text-sm font-medium pt-2">
                    {((Number(li.quantity) || 0) * (Number(li.unit_price) || 0)).toLocaleString()}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <Label>{t('billing.invoice.notes')}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={t('billing.invoice.notesPlaceholder')} />
          </Card>
        </div>

        {/* Right: totals */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3 sticky top-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('billing.invoice.subtotal')}</span>
              <span className="font-medium">{subtotal.toLocaleString()} {currency}</span>
            </div>
            <div>
              <Label className="text-xs">{t('billing.invoice.discount')}</Label>
              <Input type="number" min="0" step="0.01" value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">{t('billing.invoice.taxRate')} (%)</Label>
              <Input type="number" min="0" step="0.01" value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('billing.invoice.tax')}</span>
              <span className="font-medium">{taxAmount.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>{t('billing.invoice.total')}</span>
              <span>{total.toLocaleString()} {currency}</span>
            </div>
            <div className="space-y-2 pt-3">
              <Button className="w-full" onClick={() => save(false)} disabled={saving}>
                {saving ? t('billing.saving') : t('billing.saveAsDraft')}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => save(true)} disabled={saving}>
                {t('billing.createAndSend')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
