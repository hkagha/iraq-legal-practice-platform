import { supabase } from '@/integrations/supabase/client';

export interface ConflictMatch {
  type: 'person' | 'entity' | 'case_party' | 'errand_party';
  id: string;
  name: string;
  detail?: string;
  match_reason: string;
  severity?: 'direct' | 'possible' | 'info';
}

export interface ConflictCheckResult {
  matches: ConflictMatch[];
  match_count: number;
}

export async function runConflictCheck(input: {
  organization_id?: string;
  query_name: string;
  query_phone?: string;
  query_email?: string;
  query_tax_id?: string;
  query_national_id?: string;
  query_company_registration_number?: string;
}): Promise<ConflictCheckResult> {
  const matches: ConflictMatch[] = [];
  const name = input.query_name.trim();
  if (!name) return { matches: [], match_count: 0 };

  const namePattern = `%${name}%`;
  const activeCaseStatuses = ['intake', 'pending_conflict_review', 'active', 'on_hold', 'pending_judgment', 'appeal', 'enforcement'];
  const activeErrandStatuses = ['intake', 'new', 'in_progress', 'waiting_on_client', 'waiting_on_authority', 'awaiting_documents', 'submitted_to_government', 'under_review_by_government', 'additional_requirements'];
  const normalizePhone = (value?: string) => value?.replace(/\D/g, '') || '';
  const normalizedPhone = normalizePhone(input.query_phone);
  const exactMatchKey = (type: ConflictMatch['type'], id: string, reason: string) => `${type}:${id}:${reason}`;
  const seen = new Set<string>();

  const addMatch = (match: ConflictMatch) => {
    const key = exactMatchKey(match.type, match.id, match.match_reason);
    if (seen.has(key)) return;
    seen.add(key);
    matches.push(match);
  };

  // Persons – name match
  let personQuery = supabase
    .from('persons' as any)
    .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, secondary_phone, email, national_id_number, organization_id')
    .or(
      [
        `first_name.ilike.${namePattern}`,
        `last_name.ilike.${namePattern}`,
        `first_name_ar.ilike.${namePattern}`,
        `last_name_ar.ilike.${namePattern}`,
      ].join(',')
    )
    .limit(25);
  if (input.organization_id) personQuery = personQuery.eq('organization_id', input.organization_id);
  const { data: persons } = await personQuery;

  (persons || []).forEach((p: any) => {
    addMatch({
      type: 'person',
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || [p.first_name_ar, p.last_name_ar].filter(Boolean).join(' '),
      detail: p.phone || p.email || undefined,
      match_reason: 'name',
      severity: 'possible',
    });
  });

  // Entities – company name match
  let entityQuery = supabase
    .from('entities')
    .select('id, company_name, company_name_ar, phone, email, tax_id, company_registration_number, organization_id')
    .or(`company_name.ilike.${namePattern},company_name_ar.ilike.${namePattern}`)
    .limit(25);
  if (input.organization_id) entityQuery = entityQuery.eq('organization_id', input.organization_id);
  const { data: entities } = await entityQuery;

  (entities || []).forEach((e: any) => {
    addMatch({
      type: 'entity',
      id: e.id,
      name: e.company_name || e.company_name_ar,
      detail: e.phone || e.email || undefined,
      match_reason: 'name',
      severity: 'possible',
    });
  });

  // Phone match
  if (normalizedPhone) {
    let phonePersonQuery = supabase
      .from('persons' as any)
      .select('id, first_name, last_name, phone, secondary_phone, organization_id')
      .or(`phone.ilike.%${normalizedPhone.slice(-7)}%,secondary_phone.ilike.%${normalizedPhone.slice(-7)}%`)
      .limit(10);
    if (input.organization_id) phonePersonQuery = phonePersonQuery.eq('organization_id', input.organization_id);
    const { data: phonePersons } = await phonePersonQuery;
    (phonePersons || []).forEach((p: any) => {
      const p1 = normalizePhone(p.phone);
      const p2 = normalizePhone(p.secondary_phone);
      if (p1.endsWith(normalizedPhone.slice(-7)) || p2.endsWith(normalizedPhone.slice(-7))) {
        addMatch({
          type: 'person',
          id: p.id,
          name: [p.first_name, p.last_name].filter(Boolean).join(' '),
          detail: p.phone || p.secondary_phone,
          match_reason: 'phone',
          severity: 'direct',
        });
      }
    });

    let phoneEntityQuery = supabase
      .from('entities')
      .select('id, company_name, phone, organization_id')
      .ilike('phone', `%${normalizedPhone.slice(-7)}%`)
      .limit(10);
    if (input.organization_id) phoneEntityQuery = phoneEntityQuery.eq('organization_id', input.organization_id);
    const { data: phoneEntities } = await phoneEntityQuery;
    (phoneEntities || []).forEach((e: any) => {
      if (normalizePhone(e.phone).endsWith(normalizedPhone.slice(-7))) {
        addMatch({
          type: 'entity',
          id: e.id,
          name: e.company_name,
          detail: e.phone,
          match_reason: 'phone',
          severity: 'direct',
        });
      }
    });
  }

  // Email match
  if (input.query_email) {
    const email = input.query_email.trim().toLowerCase();
    let emailPersonQuery = supabase
      .from('persons' as any)
      .select('id, first_name, last_name, email, organization_id')
      .ilike('email', email)
      .limit(10);
    if (input.organization_id) emailPersonQuery = emailPersonQuery.eq('organization_id', input.organization_id);
    const { data: emailPersons } = await emailPersonQuery;
    (emailPersons || []).forEach((p: any) => {
      addMatch({
          type: 'person',
          id: p.id,
          name: [p.first_name, p.last_name].filter(Boolean).join(' '),
          detail: p.email,
          match_reason: 'email',
          severity: 'direct',
      });
    });

    let emailEntityQuery = supabase
      .from('entities')
      .select('id, company_name, email, organization_id')
      .ilike('email', email)
      .limit(10);
    if (input.organization_id) emailEntityQuery = emailEntityQuery.eq('organization_id', input.organization_id);
    const { data: emailEntities } = await emailEntityQuery;
    (emailEntities || []).forEach((e: any) => {
      addMatch({
        type: 'entity',
        id: e.id,
        name: e.company_name,
        detail: e.email,
        match_reason: 'email',
        severity: 'direct',
      });
    });
  }

  // National ID match (persons)
  if (input.query_national_id) {
    let nationalIdQuery = supabase
      .from('persons' as any)
      .select('id, first_name, last_name, national_id_number, organization_id')
      .eq('national_id_number', input.query_national_id.trim())
      .limit(10);
    if (input.organization_id) nationalIdQuery = nationalIdQuery.eq('organization_id', input.organization_id);
    const { data: nationalIdPersons } = await nationalIdQuery;
    (nationalIdPersons || []).forEach((p: any) => {
      addMatch({
        type: 'person',
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' '),
        detail: p.national_id_number,
        match_reason: 'national_id',
        severity: 'direct',
      });
    });
  }

  // Tax / registration ID matches (entities)
  if (input.query_tax_id) {
    let taxEntityQuery = supabase
      .from('entities')
      .select('id, company_name, tax_id, organization_id')
      .eq('tax_id', input.query_tax_id)
      .limit(10);
    if (input.organization_id) taxEntityQuery = taxEntityQuery.eq('organization_id', input.organization_id);
    const { data: taxEntities } = await taxEntityQuery;
    (taxEntities || []).forEach((e: any) => {
      addMatch({
          type: 'entity',
          id: e.id,
          name: e.company_name,
          detail: e.tax_id,
          match_reason: 'tax_id',
          severity: 'direct',
      });
    });
  }

  if (input.query_company_registration_number) {
    let regEntityQuery = supabase
      .from('entities')
      .select('id, company_name, company_registration_number, organization_id')
      .eq('company_registration_number', input.query_company_registration_number.trim())
      .limit(10);
    if (input.organization_id) regEntityQuery = regEntityQuery.eq('organization_id', input.organization_id);
    const { data: regEntities } = await regEntityQuery;
    (regEntities || []).forEach((e: any) => {
      addMatch({
        type: 'entity',
        id: e.id,
        name: e.company_name,
        detail: e.company_registration_number,
        match_reason: 'company_registration_number',
        severity: 'direct',
      });
    });
  }

  const personIds = [...new Set(matches.filter((m) => m.type === 'person').map((m) => m.id))];
  const entityIds = [...new Set(matches.filter((m) => m.type === 'entity').map((m) => m.id))];

  // Party rows on active cases.
  const partyFilters = [
    personIds.length ? `person_id.in.(${personIds.join(',')})` : null,
    entityIds.length ? `entity_id.in.(${entityIds.join(',')})` : null,
  ].filter(Boolean).join(',');
  if (partyFilters) {
    let casePartyQuery = supabase
      .from('case_parties' as any)
      .select('id, role, party_type, person_id, entity_id, case_id, cases!inner(id, case_number, title, status)')
      .or(partyFilters)
      .in('cases.status', activeCaseStatuses)
      .limit(50);
    if (input.organization_id) casePartyQuery = casePartyQuery.eq('organization_id', input.organization_id);
    const { data: caseParties } = await casePartyQuery;
    (caseParties || []).forEach((row: any) => {
      const c = row.cases;
      addMatch({
        type: 'case_party',
        id: c?.id || row.case_id,
        name,
        detail: [c?.case_number, c?.title, row.role].filter(Boolean).join(' · '),
        match_reason: row.role === 'client' ? 'client_on_active_case' : `${row.role}_on_active_case`,
        severity: row.role === 'client' ? 'possible' : 'direct',
      });
    });
  }

  // Active errands where the queried party is already a client.
  const errandFilters = [
    personIds.length ? `person_id.in.(${personIds.join(',')})` : null,
    entityIds.length ? `entity_id.in.(${entityIds.join(',')})` : null,
  ].filter(Boolean).join(',');
  if (errandFilters) {
    let errandQuery = supabase
      .from('errands' as any)
      .select('id, errand_number, title, status, person_id, entity_id')
      .or(errandFilters)
      .in('status', activeErrandStatuses)
      .limit(50);
    if (input.organization_id) errandQuery = errandQuery.eq('organization_id', input.organization_id);
    const { data: errands } = await errandQuery;
    (errands || []).forEach((e: any) => {
      addMatch({
        type: 'errand_party',
        id: e.id,
        name,
        detail: [e.errand_number, e.title].filter(Boolean).join(' · '),
        match_reason: 'client_on_active_errand',
        severity: 'info',
      });
    });
  }

  // Legacy opposing parties on existing active cases.
  let opposingCaseQuery = supabase
    .from('cases')
    .select('id, case_number, title, status, opposing_party_name, opposing_party_name_ar')
    .or(`opposing_party_name.ilike.${namePattern},opposing_party_name_ar.ilike.${namePattern}`)
    .in('status', activeCaseStatuses)
    .limit(15);
  if (input.organization_id) opposingCaseQuery = opposingCaseQuery.eq('organization_id', input.organization_id);
  const { data: opposingCases } = await opposingCaseQuery;

  (opposingCases || []).forEach((c: any) => {
    addMatch({
      type: 'case_party',
      id: c.id,
      name: c.opposing_party_name || c.opposing_party_name_ar,
      detail: [c.case_number, c.title].filter(Boolean).join(' · '),
      match_reason: 'legacy_opposing_party_on_active_case',
      severity: 'direct',
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
