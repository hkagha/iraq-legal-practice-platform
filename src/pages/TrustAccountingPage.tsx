import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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

const TX_TYPES: { value: TrustTxType; label: string }[] = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'invoice_application', label: 'Apply to Invoice' },
  { value: 'refund', label: 'Refund' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer', label: 'Transfer' },
];

export default function TrustAccountingPage() {
  const { profile } = useAuth();
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
      toast.error(e.message || 'Failed to load trust accounts');
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
      toast.success('Trust account created');
      setOpenAcct(false);
      setAcctName('');
      await refresh();
      setSelectedId(a.id);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create account');
    }
  }

  async function handleCreateTx() {
    if (!selected || !orgId) return;
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
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
      toast.success('Transaction recorded');
      setOpenTx(false);
      setTxAmount(''); setTxRef(''); setTxNotes('');
      const [list, t] = await Promise.all([listTrustAccounts(), listTrustTransactions(selected.id)]);
      setAccounts(list);
      setTxs(t);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record transaction');
    }
  }

  const fmt = (n: number, c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="p-6 space-y-6">
      <SEO title="Trust Accounting" description="Client retainer trust ledger" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trust Accounting</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client retainer balances and ledger entries</p>
        </div>
        <Button onClick={() => setOpenAcct(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Trust Account
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Accounts</CardTitle></CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[600px] overflow-auto">
            {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
            {!loading && accounts.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No trust accounts yet.
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
              <CardTitle className="text-base">{selected?.name || 'Select an account'}</CardTitle>
              {selected && (
                <div className="text-2xl font-semibold mt-1 font-mono">
                  {fmt(Number(selected.balance || 0), selected.currency)}
                </div>
              )}
            </div>
            {selected && (
              <Button size="sm" onClick={() => setOpenTx(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Transaction
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Pick a trust account to view its ledger.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {txs.map((t) => {
                    const sign = ['deposit', 'refund', 'adjustment'].includes(t.transaction_type) ? 1 : -1;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.transaction_date}</TableCell>
                        <TableCell className="capitalize">{t.transaction_type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.reference || '—'}</TableCell>
                        <TableCell className={`text-right font-mono ${sign > 0 ? 'text-green-600' : 'text-destructive'}`}>
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
          <DialogHeader><DialogTitle>New Trust Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Name</Label>
              <Input value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="Client name or matter" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client Type</Label>
                <Select value={acctParty} onValueChange={(v) => setAcctParty(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Person</SelectItem>
                    <SelectItem value="entity">Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
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
            <Button variant="outline" onClick={() => setOpenAcct(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New tx dialog */}
      <Dialog open={openTx} onOpenChange={setOpenTx}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Trust Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={txType} onValueChange={(v) => setTxType(v as TrustTxType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ({selected?.currency})</Label>
              <Input type="number" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="Receipt #, wire ref, etc." />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={txNotes} onChange={(e) => setTxNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTx(false)}>Cancel</Button>
            <Button onClick={handleCreateTx}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
