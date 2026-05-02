import { supabase } from '@/integrations/supabase/client';

type MatterDefaults = {
  is_billable: boolean;
  billing_rate: number | null;
  billing_rate_currency: string;
};

async function getActiveBillingRate(params: {
  organizationId: string;
  userId: string;
  caseId?: string | null;
}): Promise<{ rate: number | null; currency: string | null }> {
  let query = supabase
    .from('billing_rates' as any)
    .select('rate, currency, case_id, user_id, effective_from')
    .eq('organization_id', params.organizationId)
    .lte('effective_from', new Date().toISOString().slice(0, 10))
    .or(`user_id.eq.${params.userId},user_id.is.null`)
    .order('effective_from', { ascending: false })
    .limit(20);

  const { data } = await query;
  const rows = ((data || []) as any[]).filter((r) => {
    if (params.caseId) return !r.case_id || r.case_id === params.caseId;
    return !r.case_id;
  });
  const best = rows.find((r) => r.case_id === params.caseId && r.user_id === params.userId)
    || rows.find((r) => r.case_id === params.caseId)
    || rows.find((r) => r.user_id === params.userId)
    || rows[0];

  return best ? { rate: Number(best.rate) || null, currency: best.currency || null } : { rate: null, currency: null };
}

export async function resolveTimeBillingDefaults(params: {
  organizationId: string;
  userId: string;
  caseId?: string | null;
  errandId?: string | null;
}): Promise<MatterDefaults> {
  const fallback: MatterDefaults = { is_billable: true, billing_rate: null, billing_rate_currency: 'IQD' };

  if (params.caseId) {
    const [{ data: c }, activeRate] = await Promise.all([
      supabase
        .from('cases')
        .select('billing_type, hourly_rate, estimated_value_currency')
        .eq('id', params.caseId)
        .maybeSingle(),
      getActiveBillingRate({ organizationId: params.organizationId, userId: params.userId, caseId: params.caseId }),
    ]);
    const billingType = (c as any)?.billing_type || 'hourly';
    const isBillable = billingType === 'hourly';
    return {
      is_billable: isBillable,
      billing_rate: isBillable ? (Number((c as any)?.hourly_rate) || activeRate.rate || null) : null,
      billing_rate_currency: activeRate.currency || (c as any)?.estimated_value_currency || 'IQD',
    };
  }

  if (params.errandId) {
    const [{ data: e }, activeRate] = await Promise.all([
      supabase
        .from('errands' as any)
        .select('billing_type, hourly_rate, estimated_value_currency')
        .eq('id', params.errandId)
        .maybeSingle(),
      getActiveBillingRate({ organizationId: params.organizationId, userId: params.userId }),
    ]);
    const billingType = (e as any)?.billing_type || 'fixed_fee';
    const isBillable = billingType === 'hourly';
    return {
      is_billable: isBillable,
      billing_rate: isBillable ? (Number((e as any)?.hourly_rate) || activeRate.rate || null) : null,
      billing_rate_currency: activeRate.currency || (e as any)?.estimated_value_currency || 'IQD',
    };
  }

  return fallback;
}
