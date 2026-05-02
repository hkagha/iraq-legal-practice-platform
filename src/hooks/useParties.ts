import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PersonRow, EntityRow } from '@/types/parties';

export interface UsePartiesOptions {
  search?: string;
  /** 'all' | 'person' | 'entity' */
  type?: 'all' | 'person' | 'entity';
  /** Status filter */
  status?: string;
  enabled?: boolean;
  limit?: number;
}

export interface UnifiedPartyRow {
  id: string;
  partyType: 'person' | 'entity';
  person?: PersonRow;
  entity?: EntityRow;
  status: string;
  createdAt: string;
}

type UnifiedPartyViewRow = {
  id: string;
  party_type: 'person' | 'entity';
  status: string;
  created_at: string;
  updated_at: string;
};

/**
 * Returns persons + entities in one org-scoped, searchable, consistently ordered list.
 * The database view handles the union/search/order; follow-up table fetches keep the
 * existing row shape used by party pickers and client pages.
 */
export function useParties(opts: UsePartiesOptions = {}) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { search = '', type = 'all', status, enabled = true, limit = 200 } = opts;

  return useQuery({
    queryKey: ['parties', orgId, search, type, status, limit],
    enabled: !!orgId && enabled,
    queryFn: async (): Promise<UnifiedPartyRow[]> => {
      let q = supabase
        .from('v_parties_unified')
        .select('id, party_type, status, created_at, updated_at')
        .eq('organization_id', orgId!)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (type !== 'all') q = q.eq('party_type', type);
      if (status) q = q.eq('status', status);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(
          [
            `display_name.ilike.${s}`,
            `display_name_ar.ilike.${s}`,
            `email.ilike.${s}`,
            `phone.ilike.${s}`,
            `national_id_number.ilike.${s}`,
            `company_registration_number.ilike.${s}`,
            `tax_id.ilike.${s}`,
          ].join(','),
        );
      }

      const { data: indexRows, error } = await q;
      if (error) throw error;

      const rows = (indexRows ?? []) as UnifiedPartyViewRow[];
      const personIds = rows.filter((r) => r.party_type === 'person').map((r) => r.id);
      const entityIds = rows.filter((r) => r.party_type === 'entity').map((r) => r.id);

      const [personsResult, entitiesResult] = await Promise.all([
        personIds.length
          ? supabase.from('persons').select('*').in('id', personIds)
          : Promise.resolve({ data: [] as PersonRow[], error: null }),
        entityIds.length
          ? supabase.from('entities').select('*').in('id', entityIds)
          : Promise.resolve({ data: [] as EntityRow[], error: null }),
      ]);

      if (personsResult.error) throw personsResult.error;
      if (entitiesResult.error) throw entitiesResult.error;

      const personsById = new Map((personsResult.data as PersonRow[]).map((p) => [p.id, p]));
      const entitiesById = new Map((entitiesResult.data as EntityRow[]).map((e) => [e.id, e]));

      return rows.flatMap<UnifiedPartyRow>((row) => {
        if (row.party_type === 'person') {
          const person = personsById.get(row.id);
          return person ? [{ id: row.id, partyType: 'person' as const, person, status: person.status, createdAt: person.created_at }] : [];
        }

        const entity = entitiesById.get(row.id);
        return entity ? [{ id: row.id, partyType: 'entity' as const, entity, status: entity.status, createdAt: entity.created_at }] : [];
      });
    },
  });
}

/** Fetch a single person. */
export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ['person', id],
    enabled: !!id,
    queryFn: async (): Promise<PersonRow | null> => {
      const { data, error } = await supabase.from('persons').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as PersonRow | null;
    },
  });
}

/** Fetch a single entity. */
export function useEntity(id: string | undefined) {
  return useQuery({
    queryKey: ['entity', id],
    enabled: !!id,
    queryFn: async (): Promise<EntityRow | null> => {
      const { data, error } = await supabase.from('entities').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as EntityRow | null;
    },
  });
}
