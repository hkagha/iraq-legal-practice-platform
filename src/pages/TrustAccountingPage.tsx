import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  listTrustAccounts,
  createTrustAccount,
  listTrustTransactions,
  createTrustTransaction,
  type TrustAccount,
  type TrustTransaction,
  type TrustTxType,
} from '@/lib/trustAccounting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SEO from '@/components/SEO';
import { toast } from 'sonner';
import { Plus, Wallet } from 'lucide-react';

const TX_TYPES: { value: TrustTxType; label: string; labelAr: string }[] = [
  { value: 'deposit', label: 'Deposit', labelAr: 'إيداع' },
  { value: 'withdrawal', label: 'Withdrawal', labelAr: 'سحب' },
  { value: 'invoice_application', label: 'Apply to Invoice', labelAr: 'تسوية على فاتورة' },
  { value: 'refund', label: 'Refund', labelAr: 'استرداد' },
  { value: 'adjustment', label: 'Adjustment', labelAr: 'تسوية' },
  { value: 'transfer', label: 'Transfer', labelAr: 'تحويل' },
];

export default function TrustAccountingPage() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isAR = language === 'ar';
  const t = (en: string, ar: string) => (isAR ? ar : en);
  const orgId = profile?.organization_id || '';
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [txs, setTxs] = useState<TrustTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAcct, setOpenAcct] = useState(false);
  const [openTx, setOpenTx] = useState(false);

  // New account form
  const [acctName, setAcctName] = useState('');
  const [acctParty, setAcctParty] = useState<'person' | 'entity'>('person');
  const [acctCurrency, setAcctCurrency] = useState('IQD');

  // New tx form
  const [txType, setTxType] = useState<TrustTxType>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txNotes, setTxNotes] = useState('');

  const selected = useMemo(() => accounts.find((a) => a.id === selectedId) || null, [accounts, selectedId]);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listTrustAccounts();
      setAccounts(list);
      if (!selectedId && list.length) setSelectedId(list[0].id);
    } catch (e: any) {
      toast.error(e.message || t('Failed to load trust accounts', 'تعذر تحميل حسابات الأمانات'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  useEffect(() => {
    if (!selectedId) { setTxs([]); return; }
    listTrustTransactions(selectedId).then(setTxs).catch((e) => toast.error(e.message));
  }, [selectedId]);

  async function handleCreateAccount() {
    if (!orgId || !acctName.trim()) return;
    try {
      const a = await createTrustAccount({
        organization_id: orgId,
        party_type: acctParty,
        name: acctName.trim(),
        currency: acctCurrency,
        created_by: profile?.id,
      });
      toast.success(t('Trust account created', 'تم إنشاء حساب الأمانات'));
      setOpenAcct(false);
      setAcctName('');
      await refresh();
      setSelectedId(a.id);
    } catch (e: any) {
      toast.error(e.message || t('Failed to create account', 'تعذر إنشاء الحساب'));
    }
  }

  async function handleCreateTx() {
    if (!selected || !orgId) return;
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { toast.error(t('Enter a valid amount', 'أدخل مبلغاً صحيحاً')); return; }
    try {
      await createTrustTransaction({
        organization_id: orgId,
        trust_account_id: selected.id,
        transaction_type: txType,
        amount: amt,
        currency: selected.currency,
        reference: txRef || null,
        notes: txNotes || null,
        created_by: profile?.id,
      });
      toast.success(t('Transaction recorded', 'تم تسجيل الحركة'));
      setOpenTx(false);
      setTxAmount(''); setTxRef(''); setTxNotes('');
      const [list, txList] = await Promise.all([listTrustAccounts(), listTrustTransactions(selected.id)]);
      setAccounts(list);
      setTxs(txList);
    } catch (e: any) {
      toast.error(e.message || t('Failed to record transaction', 'تعذر تسجيل الحركة'));
    }
  }

  const fmt = (n: number, c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="p-6 space-y-6">
      <SEO title={t('Trust Accounting', 'حسابات الأمانات')} description={t('Client retainer trust ledger', 'سجل أمانات العملاء والدفعات المقدمة')} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('Trust Accounting', 'حسابات الأمانات')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage client retainer balances and ledger entries', 'إدارة أرصدة أمانات العملاء وحركات السجل')}</p>
        </div>
        <Button onClick={() => setOpenAcct(true)}>
          <Plus className="h-4 w-4 me-2" /> {t('New Trust Account', 'حساب أمانات جديد')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Accounts', 'الحسابات')}</CardTitle></CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[600px] overflow-auto">
            {loading && <div className="p-3 text-sm text-muted-foreground">{t('Loading...', 'جار التحميل...')}</div>}
            {!loading && accounts.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {t('No trust accounts yet.', 'لا توجد حسابات أمانات بعد.')}
              </div>
            )}
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-start p-3 rounded-md hover:bg-muted transition ${selectedId === a.id ? 'bg-muted' : ''}`}
              >
                <div className="font-medium text-sm">{a.name}</div>
                <div className="text-xs text-muted-foreground flex justify-between mt-1">
                  <span>{a.party_type}</span>
                  <span className="font-mono">{fmt(Number(a.balance || 0), a.currency)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{selected?.name || t('Select an account', 'اختر حساباً')}</CardTitle>
              {selected && (
                <div className="text-2xl font-semibold mt-1 font-mono">
                  {fmt(Number(selected.balance || 0), selected.currency)}
                </div>
              )}
            </div>
            {selected && (
              <Button size="sm" onClick={() => setOpenTx(true)}>
                <Plus className="h-4 w-4 me-2" /> {t('New Transaction', 'حركة جديدة')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                {t('Pick a trust account to view its ledger.', 'اختر حساب أمانات لعرض سجله.')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Date', 'التاريخ')}</TableHead>
                    <TableHead>{t('Type', 'النوع')}</TableHead>
                    <TableHead>{t('Reference', 'المرجع')}</TableHead>
                    <TableHead className="text-end">{t('Amount', 'المبلغ')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                        {t('No transactions yet.', 'لا توجد حركات بعد.')}
                      </TableCell>
                    </TableRow>
                  )}
                  {txs.map((t) => {
                    const sign = ['deposit', 'refund', 'adjustment'].includes(t.transaction_type) ? 1 : -1;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.transaction_date}</TableCell>
                        <TableCell>{TX_TYPES.find((type) => type.value === t.transaction_type)?.[isAR ? 'labelAr' : 'label'] || t.transaction_type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.reference || '—'}</TableCell>
                        <TableCell className={`text-end font-mono ${sign > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {sign > 0 ? '+' : '-'}{fmt(Number(t.amount), t.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New account dialog */}
      <Dialog open={openAcct} onOpenChange={setOpenAcct}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('New Trust Account', 'حساب أمانات جديد')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Account Name', 'اسم الحساب')}</Label>
              <Input value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder={t('Client name or matter', 'اسم العميل أو الملف')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('Client Type', 'نوع العميل')}</Label>
                <Select value={acctParty} onValueChange={(v) => setAcctParty(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">{t('Person', 'شخص')}</SelectItem>
                    <SelectItem value="entity">{t('Entity', 'شركة / جهة اعتبارية')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('Currency', 'العملة')}</Label>
                <Select value={acctCurrency} onValueChange={setAcctCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQD">IQD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAcct(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleCreateAccount}>{t('Create', 'إنشاء')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New tx dialog */}
      <Dialog open={openTx} onOpenChange={setOpenTx}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('New Trust Transaction', 'حركة أمانات جديدة')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Type', 'النوع')}</Label>
              <Select value={txType} onValueChange={(v) => setTxType(v as TrustTxType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{isAR ? type.labelAr : type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Amount', 'المبلغ')} ({selected?.currency})</Label>
              <Input type="number" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
            </div>
            <div>
              <Label>{t('Reference', 'المرجع')}</Label>
              <Input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder={t('Receipt #, wire ref, etc.', 'رقم الوصل أو مرجع التحويل...')} />
            </div>
            <div>
              <Label>{t('Notes', 'ملاحظات')}</Label>
              <Input value={txNotes} onChange={(e) => setTxNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTx(false)}>{t('Cancel', 'إلغاء')}</Button>
            <Button onClick={handleCreateTx}>{t('Record', 'تسجيل')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
