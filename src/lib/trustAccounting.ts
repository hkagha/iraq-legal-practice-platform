import { supabase } from '@/integrations/supabase/client';

export type TrustTxType =
  | 'deposit'
  | 'withdrawal'
  | 'invoice_application'
  | 'transfer'
  | 'adjustment'
  | 'refund';

export interface TrustAccount {
  id: string;
  organization_id: string;
  party_type: 'person' | 'entity';
  person_id: string | null;
  entity_id: string | null;
  name: string;
  currency: string;
  balance: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustTransaction {
  id: string;
  organization_id: string;
  trust_account_id: string;
  transaction_type: TrustTxType;
  amount: number;
  currency: string;
  transaction_date: string;
  reference: string | null;
  invoice_id: string | null;
  case_id: string | null;
  errand_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export async function listTrustAccounts(): Promise<TrustAccount[]> {
  const { data, error } = await supabase
    .from('trust_accounts' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as TrustAccount[];
}

export async function createTrustAccount(input: {
  organization_id: string;
  party_type: 'person' | 'entity';
  person_id?: string | null;
  entity_id?: string | null;
  name: string;
  currency?: string;
  notes?: string | null;
  created_by?: string | null;
}): Promise<TrustAccount> {
  const { data, error } = await supabase
    .from('trust_accounts' as any)
    .insert({
      organization_id: input.organization_id,
      party_type: input.party_type,
      person_id: input.person_id ?? null,
      entity_id: input.entity_id ?? null,
      name: input.name,
      currency: input.currency ?? 'IQD',
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as TrustAccount;
}

export async function listTrustTransactions(accountId: string): Promise<TrustTransaction[]> {
  const { data, error } = await supabase
    .from('trust_transactions' as any)
    .select('*')
    .eq('trust_account_id', accountId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as TrustTransaction[];
}

export async function createTrustTransaction(input: {
  organization_id: string;
  trust_account_id: string;
  transaction_type: TrustTxType;
  amount: number;
  currency?: string;
  transaction_date?: string;
  reference?: string | null;
  invoice_id?: string | null;
  case_id?: string | null;
  errand_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): Promise<TrustTransaction> {
  const { data, error } = await supabase
    .from('trust_transactions' as any)
    .insert({
      organization_id: input.organization_id,
      trust_account_id: input.trust_account_id,
      transaction_type: input.transaction_type,
      amount: input.amount,
      currency: input.currency ?? 'IQD',
      transaction_date: input.transaction_date ?? new Date().toISOString().slice(0, 10),
      reference: input.reference ?? null,
      invoice_id: input.invoice_id ?? null,
      case_id: input.case_id ?? null,
      errand_id: input.errand_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as TrustTransaction;
}

export async function deleteTrustTransaction(id: string): Promise<void> {
  throw new Error('Trust transactions cannot be deleted. Create a reversing entry instead.');
}
