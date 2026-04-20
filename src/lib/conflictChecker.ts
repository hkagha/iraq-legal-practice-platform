import { supabase } from '@/integrations/supabase/client';

export interface ConflictMatch {
  type: 'person' | 'entity' | 'case_party';
  id: string;
  name: string;
  detail?: string;
  match_reason: string;
}

export interface ConflictCheckResult {
  matches: ConflictMatch[];
  match_count: number;
}

export async function runConflictCheck(input: {
  query_name: string;
  query_phone?: string;
  query_email?: string;
  query_tax_id?: string;
}): Promise<ConflictCheckResult> {
  const matches: ConflictMatch[] = [];
  const name = input.query_name.trim();
  if (!name) return { matches: [], match_count: 0 };

  const namePattern = `%${name}%`;

  // Persons – name match
  const { data: persons } = await supabase
    .from('persons' as any)
    .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, email')
    .or(
      [
        `first_name.ilike.${namePattern}`,
        `last_name.ilike.${namePattern}`,
        `first_name_ar.ilike.${namePattern}`,
        `last_name_ar.ilike.${namePattern}`,
      ].join(',')
    )
    .limit(25);

  (persons || []).forEach((p: any) => {
    matches.push({
      type: 'person',
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || [p.first_name_ar, p.last_name_ar].filter(Boolean).join(' '),
      detail: p.phone || p.email || undefined,
      match_reason: 'name',
    });
  });

  // Entities – company name match
  const { data: entities } = await supabase
    .from('entities')
    .select('id, company_name, company_name_ar, phone, email, tax_id')
    .or(`company_name.ilike.${namePattern},company_name_ar.ilike.${namePattern}`)
    .limit(25);

  (entities || []).forEach((e: any) => {
    matches.push({
      type: 'entity',
      id: e.id,
      name: e.company_name || e.company_name_ar,
      detail: e.phone || e.email || undefined,
      match_reason: 'name',
    });
  });

  // Phone match
  if (input.query_phone) {
    const { data: phonePersons } = await supabase
      .from('persons' as any)
      .select('id, first_name, last_name, phone')
      .eq('phone', input.query_phone)
      .limit(10);
    (phonePersons || []).forEach((p: any) => {
      if (!matches.find((m) => m.id === p.id)) {
        matches.push({
          type: 'person',
          id: p.id,
          name: [p.first_name, p.last_name].filter(Boolean).join(' '),
          detail: p.phone,
          match_reason: 'phone',
        });
      }
    });
  }

  // Email match
  if (input.query_email) {
    const { data: emailPersons } = await supabase
      .from('persons' as any)
      .select('id, first_name, last_name, email')
      .eq('email', input.query_email)
      .limit(10);
    (emailPersons || []).forEach((p: any) => {
      if (!matches.find((m) => m.id === p.id)) {
        matches.push({
          type: 'person',
          id: p.id,
          name: [p.first_name, p.last_name].filter(Boolean).join(' '),
          detail: p.email,
          match_reason: 'email',
        });
      }
    });
  }

  // Tax ID match (entities)
  if (input.query_tax_id) {
    const { data: taxEntities } = await supabase
      .from('entities')
      .select('id, company_name, tax_id')
      .eq('tax_id', input.query_tax_id)
      .limit(10);
    (taxEntities || []).forEach((e: any) => {
      if (!matches.find((m) => m.id === e.id)) {
        matches.push({
          type: 'entity',
          id: e.id,
          name: e.company_name,
          detail: e.tax_id,
          match_reason: 'tax_id',
        });
      }
    });
  }

  // Opposing parties on existing cases (text search on case fields)
  const { data: opposingCases } = await supabase
    .from('cases')
    .select('id, case_number, opposing_party_name, opposing_party_name_ar')
    .or(`opposing_party_name.ilike.${namePattern},opposing_party_name_ar.ilike.${namePattern}`)
    .limit(15);

  (opposingCases || []).forEach((c: any) => {
    matches.push({
      type: 'case_party',
      id: c.id,
      name: c.opposing_party_name || c.opposing_party_name_ar,
      detail: c.case_number,
      match_reason: 'opposing_party',
    });
  });

  return { matches, match_count: matches.length };
}

export async function saveConflictCheck(input: {
  organization_id: string;
  checked_by: string;
  query_name: string;
  query_type?: string;
  query_phone?: string;
  query_email?: string;
  query_tax_id?: string;
  results: ConflictMatch[];
  notes?: string;
  case_id?: string;
}) {
  const status = input.results.length === 0 ? 'clear' : 'conflict';
  const { data, error } = await supabase
    .from('conflict_checks' as any)
    .insert({
      organization_id: input.organization_id,
      checked_by: input.checked_by,
      query_name: input.query_name,
      query_type: input.query_type ?? 'person',
      query_phone: input.query_phone,
      query_email: input.query_email,
      query_tax_id: input.query_tax_id,
      results: input.results as any,
      match_count: input.results.length,
      status,
      notes: input.notes,
      case_id: input.case_id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
